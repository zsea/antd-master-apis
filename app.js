global.JSON = require('json-bigint');
const Koa = require("koa")
    , Router = require('koa-router')
    , log4js = require('log4js')
    , cfg = require("./configure/index")
    , moment = require("moment")
    , db = new (require("linq2mysql"))(cfg.MYSQL)
    , JWT = require('jsonwebtoken')
    , md5 = require("md5")
    , WEB_PORT = cfg.WEB_PORT
    , minimatch = require("minimatch")
    ;
const logger = log4js.getLogger("antd-master-api");
logger.level = cfg.LOG_LEVEL;
const webApp = new Koa();
//webApp.use(cors());
webApp.use(koaBody({
    formLimit: "10mb",
    jsonLimit: "10mb",
    textLimit: "10mb",
    multipart: true,
    formidable: {
        maxFileSize: "100mb"
    }
}));
async function UpdateCookies(ctx, username) {
    let content = {
        username: username,
        time: moment().unix()
    }
    logger.debug("WRITE TOKEN", username);
    var token = JWT.sign(content, cfg.JWTKEY);
    var expiesDate = moment().add(cfg.USER_KEEP_TIME, "s").toDate();
    ctx.cookies.set("token", token, { expires: expiesDate, overwrite: true, httpOnly: true });
    let account_info = { name: username };
    account_info = encodeURIComponent(JSON.stringify(account_info))
    ctx.cookies.set("account_info", account_info, { expires: expiesDate, httpOnly: false, overwrite: true });
    ctx.append("z-token", token);
    ctx.append("z-account_info", account_info);
}
webApp.use(async function (ctx, next) {
    logger.info(ctx.request.method, ctx.request.path);
    var needAuth = true;
    var method = ctx.request.method;
    if (cfg && cfg.NotAuth && cfg.NotAuth[method] && cfg.NotAuth[method].some(function (p) {
        return minimatch(ctx.request.path, p);
    })) {
        needAuth = false;
    }
    if (needAuth) {
        var token = ctx.cookies.get("token");
        if (!token) {
            ctx.body = {
                success: false,
                message: "认证失败，请尝试重新登录。",
                code: "isv.auth-failed"
            }
            return
        }
        try {
            var decoded = JWT.verify(token, cfg.JWTKEY);
            logger.debug("READ TOKEN", JSON.stringify(decoded));
        }
        catch (e) {
            ctx.body = {
                success: false,
                message: "认证失败，请尝试重新登录。",
                code: "isv.auth-failed"
            }
            return
        }
        //logger.debug(decoded);
        if (Math.abs(decoded.time - moment().unix()) > cfg.USER_KEEP_TIME) {
            ctx.body = {
                success: false,
                message: "认证失败，请尝试重新登录。",
                code: "isv.auth-failed"
            }
            return;
        }
        UpdateCookies(ctx, decoded["username"], decoded["token"]);
        ctx.request.params = {
            username: decoded["username"]
        }
    }

    await next();
});
const router = new Router();
webApp.use(router.routes()).use(router.allowedMethods());
webApp.listen(WEB_PORT, function (err) {
    if (err) {
        logger.error('开启端口失败', err);
        process.exit(1);
    }
    else {
        logger.info('WEB服务启动成功 0.0.0.0:' + WEB_PORT);
    }
});