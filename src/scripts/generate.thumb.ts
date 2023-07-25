import path from 'node:path'
import fs from 'fs-extra'
import { readdir, mkdir } from 'fs/promises'
import prompts, { Choice, PromptObject } from 'prompts';
import Chalk from 'chalk'
import uploadToQiniu from '../lib/upload';
const { v4: uuid } = require('uuid');

const bucketName = 'sunzi-assets';
const folderPath = 'preload/lego-mini-v2';
const prefix = 'https://assets.sunzi.cool/preload/lego-mini-v2'
const reg = new RegExp(/([\s\S]+?)-(texture)-#(.*).(png|jpg|jpeg|svg)$/);
const errorPath: string[] = [];
const thumbPath: string[] = [];

const clothes: Choice[] = [{
  title: "clothes -> Occasion",
  value: "Occasion",
},
{
  title: "clothes -> Casual",
  value: "Casual",
},
{
  title: "clothes -> Sports",
  value: "Sports",
},
{
  title: "clothes -> Work",
  value: "Work",
}]

const pants: Choice[] = [{
  title: "pants -> Occasion",
  value: "Occasion",
},
{
  title: "pants -> Casual",
  value: "Casual",
},
{
  title: "pants -> Sports",
  value: "Sports",
},
{
  title: "pants -> Work",
  value: "Work",
}]

const questions: PromptObject[] = [
  {
    type: 'select',
    name: 'part',
    message: '请选择part 🐱',
    choices: [
      {
        title: "clothes",
        value: "clothes",
      },
      {
        title: "pants",
        value: "pants ",
      },
    ],
  },
  // {
  //   type: 'select',
  //   name: 'classify',
  //   message: '请选择classify 🐱',
  //   choices: (pre) => {
  //     if (pre === 'clothes') {
  //       return clothes
  //     }
  //     return pants
  //   }
  // }
];

const onCancel = () => {
  console.log(Chalk.red('you exit 🙀'))
  process.exit(0)
}

// const validate = (val) => {
//   const reg = /^\/(\w)/
//   return true
// }

const run = async () => {
  let uuidHashMap = {}
  let assetsPath = "";
  do {
    const { path } = await prompts({
      type: "text",
      name: "path",
      message: "enter your asset absolute path",
    }, {
      onCancel
    })
    assetsPath = (path as string).trim();
  } while (!assetsPath);

  const response = await prompts(questions, {
    onCancel
  });

  const { part } = response;



  const renameFileWithField = async (files: string[]) => {
    const sourceDir = assetsPath;
    const outputDir = path.resolve(__dirname, '../../output')

    for (const file of files) {
      const patten = file.match(reg);
      const sourcePath = path.join(sourceDir, file)

      if (!patten) {
        continue;
      }

      const name = patten[1];
      const color = patten[3];
      const positionNum = patten[2];

      const affix = patten[4]
      // 查询hashMap 中 生成的模版数据素材名对应的uuid
      const materialId = uuidHashMap[name];
      if (!materialId) {

      }
      // 为预览图时
      if (positionNum === 'texture') {
        const newFileName = `${materialId}-texture-${color}.${affix}`
        const targetPath = path.join(`${outputDir}/thumbs`, newFileName)
        fs.copy(sourcePath, targetPath);
        continue
      }
    }

  }

  // const getUploadedUrl = (name) => {
  //   return `${prefix}/${part}/${classify}/${encodeURIComponent(name)}`
  // }

  // exec
  if (!assetsPath) {
    console.log(Chalk.red('must be have assets path'))
    process.exit(0)
  }

  try {
    const outputDir = path.resolve(__dirname, '../../output')
    const material = path.resolve(__dirname, '../material/index.json')

    // 获取已生成的素材id记录 来复制对应颜色的预览图文件
    if (fs.existsSync(material)) {
      uuidHashMap = fs.readJsonSync(material);
    }

    if (!fs.existsSync(outputDir)) {
      await mkdir(outputDir)
    }

    await mkdir(path.join(outputDir, '/thumbs'))

    const files = await readdir(assetsPath);

    // 复制粘贴重命名目标文件
    await renameFileWithField(files);

    if (uuidHashMap) {
      fs.writeFile(material, JSON.stringify(uuidHashMap));
    }

    console.log('error path =>', errorPath, `${errorPath.length > 0 ? '🙀' : '🐱'}`)
  } catch (error) {
    console.log(Chalk.red(error))
  }
};


run();
