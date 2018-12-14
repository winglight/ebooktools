# 电子书生成工具

## 目的
* 从网页目录爬取-导出电子书（epub、mobi）格式
* 方便在手机或者kindle上看较长的文章、小说

## 用法
* 安装1：git clone项目到本地：
```git clone https://github.com/winglight/ebooktools```

* 安装2：进入项目目录，在命令行执行：
```npm install``` 或者 ```yarn install```

* 设置：根据需要设置config.json（kindle推送相关设置是选填项）:
```
{
  "port": "CHANGE-TO-YOURS", //kindle推送的发送邮箱smtp服务器端口
  "smtp": "CHANGE-TO-YOURS", //kindle推送的发送邮箱smtp服务器地址
  "user": "CHANGE-TO-YOURS", //kindle推送的发送邮箱账号
  "pass": "CHANGE-TO-YOURS", //kindle推送的发送邮箱密码
  "kindle": "CHANGE-TO-YOURS", //kindle推送的目标邮箱地址
  "output": "CHANGE-TO-YOURS" //电子书本地输出目录绝对路径（必填）
}
```
* 开始生成电子书：进入项目目录，在命令行执行(替换EBOOK-URL为网页地址)：
```./libs/generatebook -u EBOOK-URL```


* 目前仅支持目录型网页，而且是单层目录结构

* 目前还有个小bug：命令行接受参数"是否推送"时，无法判断，所以推送代码注释了，需要的话，手动取消注释即可
```
 if(isPush) {
     that.pushMobi(config.output);
 }
```

## 反馈
* issues
* 微信公众号（失败101）

![image](https://github.com/winglight/ebooktools/blob/master/libs/qrcode_wx.jpg?raw=true)
