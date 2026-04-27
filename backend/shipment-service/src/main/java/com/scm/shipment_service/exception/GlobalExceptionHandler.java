package com.scm.shipment_service.exception;


import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public String handle(NotFoundException ex) {
        return ex.getMessage();
    }
}
