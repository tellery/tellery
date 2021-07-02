package io.tellery.utils

import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.Instant


class Cache<K, V>(private val updater: suspend (K) -> V, private val intervalSeconds: Long) {
    private val storage: HashMap<K, V?> = hashMapOf()
    private val lastUpdatedAt: HashMap<K, Instant> = hashMapOf()
    private val exceptionStorage: HashMap<K, Pair<Exception, Int>> = hashMapOf()
    private val lock = Mutex()


    fun get(key: K): V {
        if (!lastUpdatedAt.containsKey(key)) {
            runBlocking {
                updateItem(key)
            }
        } else {
            if (lastUpdatedAt[key]!!.plusSeconds(intervalSeconds).isBefore(Instant.now())) {
                GlobalScope.launch {
                    async { updateItem(key) }.start()
                }
            }
        }
        return storage[key] ?: throw exceptionStorage[key]!!.first
    }

    private suspend fun updateItem(key: K) {
        lock.withLock {
            // Check if the content has been updated
            if (lastUpdatedAt.containsKey(key) &&
                lastUpdatedAt[key]!!.plusSeconds(intervalSeconds).isAfter(Instant.now())
            ) {
                return
            }
            try {
                val result = updater(key)
                storage[key] = result
                lastUpdatedAt[key] = Instant.now()
            } catch (err: Exception) {
                val errCount = exceptionStorage[key]?.second
                if (errCount == null) {
                    exceptionStorage[key] = err to 0
                } else {
                    exceptionStorage[key] = err to errCount + 1
                }
                if (errCount ?: 0 < 3) {
                    // if err count < 3, allow retry
                    if (lastUpdatedAt.containsKey(key)) lastUpdatedAt.remove(key)
                } else {
                    lastUpdatedAt[key] = Instant.now()
                }
                storage[key] = null
            }
        }
    }
}

