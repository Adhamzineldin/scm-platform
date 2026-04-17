package com.scm.notification.dto;

public record UserDto(
        String id,
        String email,
        String fullName,
        String phoneNumber
) {}
