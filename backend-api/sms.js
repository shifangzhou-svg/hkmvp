const tencentcloud = require('tencentcloud-sdk-nodejs');
const dotenv = require('dotenv');

dotenv.config();

// 导入对应产品模块的client models。
const SmsClient = tencentcloud.sms.v20210111.Client;

// 实例化要请求产品(以sms为例)的client对象
const client = new SmsClient({
  // 腾讯云账户密钥对secretId，secretKey。
  credential: {
    secretId: 'AKIDP7b5C978YJv4wQKqB6m3w78n987654321', // 替换为真实的SecretId
    secretKey: 'Bz78901234567890abcdefghijklmnopqrstuv', // 替换为真实的SecretKey
  },
  // 产品地域
  region: 'ap-guangzhou',
  // 可选配置实例
  profile: {
    signMethod: 'HmacSHA256', // 签名方法
    httpProfile: {
      reqTimeout: 30,
    },
  },
});

// 发送验证码
async function sendVerificationCode(phone, code) {
  try {
    const params = {
      PhoneNumberSet: [`+86${phone}`],
      TemplateId: '1234567', // 替换为真实的短信模板ID
      SignName: '滴滴打车', // 替换为真实的短信签名
      TemplateParamSet: [code], // 模板参数
      SmsSdkAppId: '1400000000', // 替换为真实的SmsSdkAppId
    };

    const result = await client.SendSms(params);
    console.log('短信发送结果:', result);
    return result;
  } catch (error) {
    console.error('短信发送失败:', error);
    throw error;
  }
}

module.exports = {
  sendVerificationCode
};
