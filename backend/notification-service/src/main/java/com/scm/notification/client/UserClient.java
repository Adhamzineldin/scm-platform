package com.scm.notification.client;

import com.scm.notification.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "auth-service")
public interface UserClient {

    @GetMapping("/api/users/{userId}")
    UserDto getUserById(@PathVariable Long userId);
}
