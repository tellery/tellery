package io.tellery.common.dbt

import com.jcraft.jsch.JSch
import com.jcraft.jsch.JSchException
import com.jcraft.jsch.Session
import mu.KotlinLogging
import org.eclipse.jgit.api.Git
import org.eclipse.jgit.lib.ProgressMonitor
import org.eclipse.jgit.merge.ContentMergeStrategy
import org.eclipse.jgit.transport.JschConfigSessionFactory
import org.eclipse.jgit.transport.OpenSshConfig
import org.eclipse.jgit.transport.SshSessionFactory
import org.eclipse.jgit.transport.SshTransport
import org.eclipse.jgit.util.FS
import java.text.SimpleDateFormat
import java.util.*

@Deprecated("")
object GitUtils {

    private val dateFormat: SimpleDateFormat = SimpleDateFormat("yyyy-MM-dd-HH-mm-ss")
    private val logger = KotlinLogging.logger { }

    fun cloneRemoteRepo(repo: DbtRepository) {
        Git.cloneRepository()
            .setDirectory(repo.gitRepoFolder)
            .setURI(repo.gitUrl)
            .setProgressMonitor(SimpleProgressMonitor())
            .setTransportConfigCallback {
                val sshTransport = it as SshTransport
                sshTransport.sshSessionFactory =
                    providesSshSessionFactory(repo.privateKey.absolutePath)
            }
            .call()
            .use {}
    }

    fun checkoutMasterAndPull(repo: DbtRepository) {
        Git.open(repo.gitRepoFolder).use {
            // JGit can't get the remote head ref.
            // 0: Local HEAD
            // 1: Local default
            // remote 1: Remote default
            val defaultBranchRef = it.repository.refDatabase.refs[1].name
            it.checkout().setName(defaultBranchRef).call()
            it.pull()
                .setContentMergeStrategy(ContentMergeStrategy.THEIRS)
                .setTransportConfigCallback { transport ->
                    val sshTransport = transport as SshTransport
                    sshTransport.sshSessionFactory =
                        providesSshSessionFactory(repo.privateKey.absolutePath)
                }
                .call()
        }
    }

    fun checkoutNewBranchAndCommitAndPush(repo: DbtRepository) {
        val branchName = "tellery/update-${dateFormat.format(Date())}"
        Git.open(repo.gitRepoFolder).use {
            it.checkout().setCreateBranch(true).setName(branchName).call()
        }
        commitAndPush(repo, null)
    }

    fun commitAndPush(repo: DbtRepository, message: String?) {
        Git.open(repo.gitRepoFolder).use {
            it.add().addFilepattern(".").call()

            it.commit()
                .setAll(true)
                .setMessage(message ?: "Sync all query blocks by tellery.")
                .call()

            it.push()
                .setTransportConfigCallback { transport ->
                    val sshTransport = transport as SshTransport
                    sshTransport.sshSessionFactory =
                        providesSshSessionFactory(repo.privateKey.absolutePath)
                }
                .call()
        }
    }

    private fun providesSshSessionFactory(privateKeyPath: String): SshSessionFactory {
        return object : JschConfigSessionFactory() {
            override fun configure(hc: OpenSshConfig.Host, session: Session) {
                session.setConfig("StrictHostKeyChecking", "no")
            }

            @Throws(JSchException::class)
            override fun createDefaultJSch(fs: FS): JSch {
                val jSch = super.createDefaultJSch(fs)
                jSch.addIdentity(privateKeyPath)
                return jSch
            }
        }
    }

    private class SimpleProgressMonitor : ProgressMonitor {
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
