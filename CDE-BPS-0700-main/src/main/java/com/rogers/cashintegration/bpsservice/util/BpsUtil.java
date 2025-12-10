package com.rogers.cashintegration.bpsservice.util;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.zip.GZIPInputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.CollectionUtils;
import org.springframework.web.multipart.MultipartFile;

public class BpsUtil {
	private static final Logger logger = LoggerFactory.getLogger(BpsUtil.class);
	private BpsUtil() {
	  }
	
	public static Set<String> listFileNamesFromCdeStore(final String fileDir, final String oldFileSuffix,
			final long fileAge, String batchGetSuffixes) throws IOException {
		if (logger.isDebugEnabled()) {
			logger.debug("BPS|BATCH_LIST|Attempting to get the list of files in given dir");
		}
		Set<String> fileSet = new HashSet<>();
		try (DirectoryStream<Path> stream = BpsUtil
				.getFiles(fileDir)) {
			for (Path path : stream) {
				if (!Files.isDirectory(path) && !path.getFileName().toString().endsWith(oldFileSuffix)) {
					String[] suffixes = batchGetSuffixes.split("\\|");
					fileSet = fetchListFilesFromCde(suffixes,path, fileAge);
				}
			}
		}
		return fileSet;
	}
	private static Set<String> fetchListFilesFromCde(String[] suffixes, Path path, long fileAge) throws IOException {
		Set<String> fileSet = new HashSet<>();
		for (String suffix : suffixes) {
			if (path.getFileName().toString().startsWith(suffix)) {

				BasicFileAttributes attr = Files.readAttributes(path, BasicFileAttributes.class);
				if (attr.lastModifiedTime().toInstant()
						.toEpochMilli() < (Instant.now().toEpochMilli() - fileAge)) {
					logger.info("BPS|BATCH_LIST|adding the file {} to the list",
							path.getFileName().toString());
					fileSet.add(path.getFileName().toString());
				}
			}

		}
		return fileSet;		
	}

	public static DirectoryStream<Path> getFiles(final String fileDir) throws IOException{
		return  Files.newDirectoryStream(Paths.get(fileDir));
	}
	public static File getFileFromCdeStore(final String fileDir,final String fileName) {
		return new File(fileDir+fileName);
		
	}
	
	
	
	public static Error createErrorResponse() {
		return null;
		
	}
	public static byte[] decompressGzipToBytes(MultipartFile file) throws IOException {

        ByteArrayOutputStream output = new ByteArrayOutputStream();

        try (GZIPInputStream gis = new GZIPInputStream(file.getInputStream())) {

            // copy GZIPInputStream to ByteArrayOutputStream
            byte[] buffer = new byte[1024];
            int len;
            while ((len = gis.read(buffer)) > 0) {
                output.write(buffer, 0, len);
            }
        }
        return output.toByteArray();
	}
		
	

	public static File getOldestFileFromCdeStore(String cdeStoragePath, String oldFileSuffix, long fileAge, String batchGetSuffixes)
			throws IOException {
		File file = null;
		Set<File> fileSet = new HashSet<>();
		try (DirectoryStream<Path> stream = BpsUtil.getFiles(cdeStoragePath)) {
			for (Path path : stream) {
				if (!Files.isDirectory(path) && !path.getFileName().toString().endsWith(oldFileSuffix)) {
					String[] suffixes = batchGetSuffixes.split("\\|");
					fileSet = fetchFileForGet(suffixes,path,fileAge);
			}
			}
		}
		if(!CollectionUtils.isEmpty(fileSet)) {
			Optional<File> firstFileOptional = fileSet.stream().sorted((p1, p2) -> Long.valueOf(p1.lastModified()).compareTo(p2.lastModified()))
				.findFirst();
			if (firstFileOptional.isPresent()) {
		        file = firstFileOptional.get();
		    }
		}
		return file;

	}

	private static Set<File> fetchFileForGet(String[] suffixes, Path path, long fileAge) throws IOException {
		Set<File> fileSet = new HashSet<>();
		for (String suffix : suffixes) {
			if (path.getFileName().toString().startsWith(suffix)) {

				BasicFileAttributes attr = Files.readAttributes(path, BasicFileAttributes.class);
				if (attr.lastModifiedTime().toInstant()
						.toEpochMilli() < (Instant.now().toEpochMilli() - fileAge)) {
					logger.info("BPS|BATCH_LIST|adding the file {} to the list",
							path.getFileName().toString());
					fileSet.add(path.toFile());
				}
			}

		}
		return fileSet;		
	}
}
