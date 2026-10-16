package dev.daesrock.eventanilla.core.data

import java.net.InetAddress
import java.net.ServerSocket
import java.net.SocketException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ApiCancellationTest {
    @Test fun cancellingTheCoroutineClosesTheActualHttpConnection() = runBlocking {
        ServerSocket(0, 1, InetAddress.getByName("127.0.0.1")).use { server ->
            val received = CountDownLatch(1)
            val disconnected = CountDownLatch(1)
            val failure = AtomicReference<Throwable?>()
            val worker = thread(isDaemon = true, name = "api-cancellation-test") {
                try {
                    server.accept().use { socket ->
                        socket.soTimeout = 3000
                        val reader = socket.getInputStream().bufferedReader()
                        var contentLength = 0
                        while (true) {
                            val line = reader.readLine() ?: error("Solicitud incompleta")
                            if (line.isEmpty()) break
                            if (line.startsWith("Content-Length:", ignoreCase = true)) {
                                contentLength =
                                    line.substringAfter(':').trim().toInt()
                            }
                        }
                        repeat(contentLength) { check(reader.read() >= 0) }
                        received.countDown()
                        try {
                            assertEquals(-1, reader.read())
                        } catch (_: SocketException) {
                            // Algunos sistemas comunican el cierre como reinicio de conexión.
                        }
                    }
                } catch (error: Throwable) {
                    failure.set(error)
                } finally {
                    disconnected.countDown()
                }
            }
            val client = ApiClient("http://127.0.0.1:${server.localPort}/")
            val request = launch(Dispatchers.Default) { client.request("probe", JSONObject().put("probe", true)) }
            try {
                assertTrue(received.await(3, TimeUnit.SECONDS))
                request.cancelAndJoin()
                assertTrue(disconnected.await(3, TimeUnit.SECONDS))
                assertNull(failure.get())
            } finally {
                request.cancelAndJoin()
                worker.join(3500)
            }
        }
    }
}
