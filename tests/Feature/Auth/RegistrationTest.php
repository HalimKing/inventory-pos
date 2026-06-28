<?php

test('registration is disabled', function () {
    $response = $this->get('/register');

    $response->assertNotFound();
});

test('public registration is not available', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertNotFound();
    $this->assertGuest();
});
