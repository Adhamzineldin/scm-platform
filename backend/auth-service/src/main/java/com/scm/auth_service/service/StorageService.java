package com.scm.auth_service.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface StorageService {
    String store(MultipartFile file, Long userId) throws IOException;
}
