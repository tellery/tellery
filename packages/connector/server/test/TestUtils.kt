import org.ktorm.database.Database
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.stream.Collectors

class TestUtils

fun getResourceFileURL(filePath: String) = TestUtils::class.java.getResource(filePath)!!

fun getResourceString(filePath: String) =
    InputStreamReader(TestUtils::class.java.getResourceAsStream(filePath)!!).use { reader ->
        BufferedReader(reader).lines().collect(Collectors.joining(System.lineSeparator()))
    }

fun execSqlScript(database: Database, filePath: String) {
    database.useConnection { conn ->
        conn.createStatement().use { statement ->
            for (sql in getResourceString(filePath).split(';')) {
                if (sql.any { it.isLetterOrDigit() }) {
                    statement.executeUpdate(sql)
                }
            }
        }
    }
}
