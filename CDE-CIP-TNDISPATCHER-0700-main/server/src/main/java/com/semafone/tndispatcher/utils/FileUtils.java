package com.semafone.tndispatcher.utils;

import com.google.common.io.ByteStreams;
import org.springframework.core.io.UrlResource;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

import static com.google.common.base.Preconditions.checkArgument;
import static com.google.common.base.Preconditions.checkNotNull;

/**
 * Utility class to process files
 */
public class FileUtils {
    private static final String FILE = "file:///";
    private static final String HTTP = "http";

    private FileUtils() {
    }

    public static String getFileContentAsString(String filePath) throws IOException {
        return new String(ByteStreams.toByteArray(getInputStream(filePath)));
    }

    public static InputStream getInputStream(String filePath) throws IOException {
        if (filePath.startsWith(HTTP)) {
            UrlResource resource = new UrlResource(filePath);
            return resource.getInputStream();
        } else if (filePath.startsWith(FILE)) {
            String fileS = filePath.substring(FILE.length());
            File file = new File(fileS);
            checkArgument(file.exists(), "File [%s] not found on FS", filePath);
            return new FileInputStream(file);
        } else {
            filePath = filePath.replace("resource:", "").replace("classpath:", "/");
            InputStream in = FileUtils.class.getClassLoader().getResourceAsStream(filePath);
            checkNotNull(in, "Resource [%s] not found on classpath", filePath);
            return in;
        }
    }
}
