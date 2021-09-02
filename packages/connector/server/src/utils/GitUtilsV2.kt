package io.tellery.utils

import com.jcraft.jsch.JSch
import com.jcraft.jsch.JSchException
import com.jcraft.jsch.Session
import mu.KotlinLogging
import org.eclipse.jgit.api.Git
import org.eclipse.jgit.api.PullResult
import org.eclipse.jgit.lib.ProgressMonitor
import org.eclipse.jgit.merge.ContentMergeStrategy
import org.eclipse.jgit.transport.*
import org.eclipse.jgit.util.FS
import java.nio.file.Path
import java.text.SimpleDateFormat
import java.util.*
import kotlin.io.path.absolutePathString

object GitUtilsV2 {
    fun cloneRemoteRepo(
        dir: Path,
        uri: String,
        privateKey: Path
    ) = Git.cloneRepository()
        .setDirectory(dir.toFile())
        .setURI(uri)
        .setProgressMonitor(SimpleProgressMonitor())
        .setTransportConfigCallback {
            (it as SshTransport).sshSessionFactory = providesSshSessionFactory(privateKey)
        }
        .call()
        .use {}

    fun checkoutMasterAndPull(
        dir: Path,
        privateKey: Path
    ): PullResult = Git.open(dir.toFile())
        .use {
            // JGit can't get the remote head ref.
            // 0: Local HEAD
            // 1: Local default
            // remote 1: Remote default
            val defaultBranchRef = it.repository.refDatabase.refs[1].name
            it.checkout().setName(defaultBranchRef).call()
            it.pull()
                .setContentMergeStrategy(ContentMergeStrategy.THEIRS)
                .setTransportConfigCallback { t ->
                    (t as SshTransport).sshSessionFactory = providesSshSessionFactory(privateKey)
                }
                .call()
        }

    fun checkoutNewBranchAndCommitAndPush(
        dir: Path,
        privateKey: Path,
        message: String
    ) {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd-HH-mm-ss")
        val branchName = "tellery/update-${dateFormat.format(Date())}"
        Git.open(dir.toFile())
            .use {
                it.checkout().setCreateBranch(true).setName(branchName).call()
            }
        commitAndPush(dir, privateKey, message)
    }

    fun commitAndPush(
        dir: Path,
        privateKey: Path,
        message: String
    ): MutableIterable<PushResult> = Git.open(dir.toFile())
        .use {
            it.add().addFilepattern(".").call()
            it.commit().setAll(true).setMessage(message).call()
            it.push()
                .setTransportConfigCallback { t ->
                    (t as SshTransport).sshSessionFactory = providesSshSessionFactory(privateKey)
                }
                .call()
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
}
