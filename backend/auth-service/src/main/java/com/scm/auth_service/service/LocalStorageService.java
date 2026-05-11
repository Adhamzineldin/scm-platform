package com.scm.auth_service.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
@Slf4j
public class LocalStorageService implements StorageService {

    @Value("${app.storage.local.dir:./uploads}")
    private String baseDir;

    private Path uploadDir;

    @PostConstruct
    public void init() throws IOException {
        uploadDir = Paths.get(baseDir).resolve("profile-pictures").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        log.info("[LocalStorageService] upload dir: {}", uploadDir);
    }

    @Override
    public String store(MultipartFile file, Long userId) throws IOException {
        String ext = getExtension(file.getOriginalFilename());
        String filename = userId + "-" + UUID.randomUUID() + ext;
        Path dest = uploadDir.resolve(filename);
        Files.copy(file.getInputStream(), dest);
        log.info("[LocalStorageService] Stored profile picture: {}", dest);
        return "/api/uploads/profile-pictures/" + filename;
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null) return ".jpg";
        int dot = originalFilename.lastIndexOf('.');
        return dot >= 0 ? originalFilename.substring(dot).toLowerCase() : ".jpg";
    }
}
