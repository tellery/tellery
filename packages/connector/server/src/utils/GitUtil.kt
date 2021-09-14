package io.tellery.utils

import com.jcraft.jsch.JSch
import com.jcraft.jsch.JSchException
import com.jcraft.jsch.Session
import mu.KotlinLogging
import org.eclipse.jgit.api.Git
import org.eclipse.jgit.api.ListBranchCommand
import org.eclipse.jgit.api.PullResult
import org.eclipse.jgit.diff.DiffEntry
import org.eclipse.jgit.lib.ProgressMonitor
import org.eclipse.jgit.lib.Repository
import org.eclipse.jgit.merge.ContentMergeStrategy
import org.eclipse.jgit.revwalk.RevWalk
import org.eclipse.jgit.transport.*
import org.eclipse.jgit.treewalk.AbstractTreeIterator
import org.eclipse.jgit.treewalk.CanonicalTreeParser
import org.eclipse.jgit.util.FS
import java.nio.file.Path
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import kotlin.io.path.absolutePathString

fun cloneRemoteRepo(
    dir: Path,
    uri: String,
    privateKey: Path,
    lock: ReentrantLock
) = lock.withLock {
    Git.cloneRepository()
        .setDirectory(dir.toFile())
        .setURI(uri)
        .setProgressMonitor(SimpleProgressMonitor())
        .setTransportConfigCallback {
            (it as SshTransport).sshSessionFactory = providesSshSessionFactory(privateKey)
        }
        .call()
        .use {}
}

fun pull(
    dir: Path,
    privateKey: Path,
    lock: ReentrantLock
): PullResult = lock.withLock {
    Git.open(dir.toFile())
        .use {
            it.pull()
                .setContentMergeStrategy(ContentMergeStrategy.THEIRS)
                .setTransportConfigCallback { t ->
                    (t as SshTransport).sshSessionFactory = providesSshSessionFactory(privateKey)
                }
                .call()
        }
}

fun commitAndPush(
    dir: Path,
    privateKey: Path,
    message: String,
    lock: ReentrantLock
): MutableIterable<PushResult> = lock.withLock {
    Git.open(dir.toFile())
        .use {
            it.add().addFilepattern(".").call()
            it.commit().setAll(true).setMessage(message).call()
            it.push()
                .setTransportConfigCallback { t ->
                    (t as SshTransport).sshSessionFactory = providesSshSessionFactory(privateKey)
                }
                .call()
        }
}

fun getDiffs(
    dir: Path,
    privateKey: Path,
    lock: ReentrantLock
): List<DiffEntry> = lock.withLock {
    Git.open(dir.toFile())
        .use { git ->
            /**
             * fetch all remote branch updates and then git diff local master with remote master.
             */
            git.fetch()
                .setCheckFetchedObjects(true)
                .setTransportConfigCallback { t ->
                    (t as SshTransport).sshSessionFactory = providesSshSessionFactory(privateKey)
                }
                .call()

            val refs = git.branchList().setListMode(ListBranchCommand.ListMode.ALL).call()
            val localMasterBranch = refs.first().name
            val remoteMasterBranch = refs.first { it.name.startsWith("refs/remotes") }.name

            val oldTreeParser = prepareTreeParser(git.repository, localMasterBranch)
            val newTreeParser = prepareTreeParser(git.repository, remoteMasterBranch)
            git.diff().setOldTree(oldTreeParser).setNewTree(newTreeParser).call()
        }
}

private fun prepareTreeParser(repo: Repository, ref: String): AbstractTreeIterator {
    val head = repo.exactRef(ref)
    RevWalk(repo).use { walk ->
        val commit = walk.parseCommit(head.objectId)
        val tree = walk.parseTree(commit.tree.id)
        val treeParser = CanonicalTreeParser()
        repo.newObjectReader().use { reader ->
            treeParser.reset(reader, tree.id)
        }
        walk.dispose()
        return treeParser
    }
}

private fun providesSshSessionFactory(privateKey: Path): SshSessionFactory {
    return object : JschConfigSessionFactory() {
        override fun configure(hc: OpenSshConfig.Host, session: Session) {
            session.setConfig("StrictHostKeyChecking", "no")
        }

        @Throws(JSchException::class)
        override fun createDefaultJSch(fs: FS): JSch {
            val jSch = super.createDefaultJSch(fs)
            jSch.addIdentity(privateKey.absolutePathString())
            return jSch
        }
    }
}

class SimpleProgressMonitor : ProgressMonitor {
    companion object {
        private val logger = KotlinLogging.logger { }
    }

    override fun start(totalTasks: Int) {
        logger.debug { "Starting work on $totalTasks tasks." }
    }

    override fun beginTask(title: String?, totalWork: Int) {
        logger.debug { "Start $title: $totalWork" }
    }

    override fun update(completed: Int) {}

    override fun endTask() {}

    override fun isCancelled(): Boolean {
        return false
    }
}
