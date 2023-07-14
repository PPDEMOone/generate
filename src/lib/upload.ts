// @ts-nocheck
const qiniu = require("qiniu");
const axios = require("axios");
const { LocalStorage } = require("node-localstorage");
const localStorage = new LocalStorage("./localstorage"); // 模拟localstorage

/** 获取qiniu token */
const getToken = async (bucket) => {
  const [token, expireTime = 0] = JSON.parse(
    localStorage.getItem(`_qiniu_token-${bucket}`) || "[]"
  );
  // 如果当前token的过期时间大于60s
  if (token && expireTime - new Date().getTime() > 60 * 1000) return token;
  const response = await axios.get(
    "https://sunzi.stylelab.com/qiniu/token/bucket",
    {
      params: {
        bucket,
      },
    }
  );
  if (response.data.error === 0) {
    // 存储token和过期时间
    localStorage.setItem(
      `_qiniu_token-${bucket}`,
      JSON.stringify([response.data.token, response.data.expire * 1000])
    );
    return response.data.token;
  }
  return undefined;
};

/**
 *
 * @param {本地文件路径} localFilePath
 * @param {文件名} targetFileName
 * @param {对应七牛bucket} targetBucket
 * @param {对应七牛上存储的文件夹} targetFolderPath
 * @returns
 */
const uploadToQiniu = async (
  localFilePath,
  targetFileName,
  targetBucket,
  targetFolderPath
) => {
  return new Promise(async (resolve, reject) => {
    const uploadToken = await getToken(targetBucket);
    const config = new qiniu.conf.Config();
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();
    const key = targetFolderPath + targetFileName;

    formUploader.putFile(
      uploadToken,
      key,
      localFilePath,
      putExtra,
      function (respErr, respBody, respInfo) {
        if (respErr) {
          throw respErr;
        }
        if (respInfo.statusCode === 200) {
          console.log("上传七牛成功", respInfo.data.key);
          resolve(respInfo.data.key);
        } else {
          console.log("上传七牛失败", respInfo.statusCode, respBody);
          resolve(undefined);
        }
      }
    );
  });
};

export default uploadToQiniu
