module.exports = {
    MYSQL: "mysql://root@127.0.0.1/new-media",
    LOG_LEVEL: "TRACE",
    JWTKEY: "zzzsea0123456789",
    USER_KEEP_TIME: 10 * 60,
    WEB_PORT: 4000,
    NotAuth: {
        "POST": ["/api/login"],
        "GET": ["/api/keepalive"]
    }
}