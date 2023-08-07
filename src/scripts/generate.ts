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
const reg = new RegExp(/([\s\S]+?)-(\d{1,3}-\d{1,3}|\d{1,3})-(#.*|.*).(png|jpg|jpeg|svg)$/);
const errorPath: string[] = [];
const thumbPath: string[] = [];

const positionMap = new Map([
  ['0', 'front'],
  ['1', 'back'],
  ['2', 'side-left'],
  ['3', 'side-right'],
  ['4', 'sleeve-left'],
  ['5', 'sleeve-right']
])

const pantPositionMap = new Map([
  ['0', 'front'],
  ['1', 'back'],
  ['2', 'side-left'],
  ['3', 'side-right'],
])

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
  {
    type: 'select',
    name: 'classify',
    message: '请选择classify 🐱',
    choices: (pre) => {
      if (pre === 'clothes') {
        return clothes
      }
      return pants
    }
  }
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

  const { classify, part } = response;
  const realPath = `${folderPath}/${part}/${classify}`

  const generateJSonPresets = async (files: string[]) => {

    const images = files.filter((file) => /\.(png|jpg|jpeg|svg)$/i.test(file));
    const assetsMap = {}

    /**
     * @description 整理 不同衣服、裤子的所拥有 颜色的路径映射关系
     * @field name 衣服 裤子等名称
     * @field color 色值 
     * @field 1、1-1 等 分别为该衣服 裤子 不同部位的贴纸
     *  如 1:衣服正面
        1-1:衣服背面
        1-2:衣服左侧
        1-3:衣服右侧
        1-4:左袖
        1-5:右袖
     * @example 
     *'name': {
        'color': {
          '1': 'Casual Leather Jacket Over T Shirt-1-#101010.png',
          '1-1': 'Casual Leather Jacket Over T Shirt-1-1-#101010.png',
          '1-2': 'Casual Leather Jacket Over T Shirt-1-2-#101010.png',
          '1-3': 'Casual Leather Jacket Over T Shirt-1-3-#101010.png',
          '1-4': 'Casual Leather Jacket Over T Shirt-1-4-#101010.png',
          '1-5': 'Casual Leather Jacket Over T Shirt-1-5-#101010.png'
        }
      }
    */
    while (images.length > 0) {
      const fileName = images.shift() ?? "";

      const patten = fileName.match(reg);

      if (!patten) {
        errorPath.push(fileName);
        continue;
      }
      const name = patten[1];
      const color = patten[3];
      const positionNum = patten[2];

      // 为预览图
      if (positionNum === 'texture') {
        // thumbPath.push(fileName)
        continue
      }

      if (!assetsMap[name]) {
        assetsMap[name] = {
          [color]: {
            [positionNum]: fileName
          }
        }
      } else {
        assetsMap[name][color] = {
          ...assetsMap[name][color],
          [positionNum]: fileName
        }
      }
    }

    const data = Object.entries(assetsMap).map(([name, value], index) => {
      const colorOptions = value as object;
      const colors = Object.entries(colorOptions).map(([color, colorPositionMap]) => {
        // const decals = Object.entries(colorPositionMap).reduce((pre, cur) => {
        //   const [num, path] = cur;
        //   const [, p2] = num.split('-')
        //   const key = p2 ? p2 : '0'
        //   const encodePath = getUploadedUrl(path)
        //   return {
        //     ...pre,
        //     [PositionMap[key]]: {
        //       src: encodePath
        //     }
        //   }
        // }, {})

        return {
          id: uuid(),
          color: color.replace(/#/, ""),
          value: color.replace(/#/, ""),
          // decals
        }
      })
      const id = uuidHashMap[name] ? uuidHashMap[name] : uuid();


      // 记录下 素材id, 设置第一个颜色为预览图路径，该路径后续由 generate.thumb 生成
      if (!uuidHashMap[name]) {
        uuidHashMap[name] = id;
      }

      return {
        id,
        name: name,
        colors,
        thumb: `${prefix}/${(part as string).trim()}/material-thumbs/${id}-texture-${colors[0].color.replace(/#/, "")}.png`
      }
    })

    return data
  };

  const renameFileWithField = async (files: string[]) => {
    const sourceDir = assetsPath;
    const outputDir = path.resolve(__dirname, '../../output/material')

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

      const [, p2] = positionNum.split('-')
      const key = p2 ? p2 : '0'

      const newFileName = `${materialId}-${color.replace(/#/, "")}-${positionMap.get(key)}.${affix}`
      const targetPath = path.join(outputDir, newFileName)

      fs.copy(sourcePath, targetPath);

      // 下装 侧边多复制一份右边
      if (key === '2' && (part as string).trimEnd() === 'pants') {
        const newFileName = `${materialId}-${color.replace(/#/, "")}-${pantPositionMap.get('3')}.${affix}`
        const targetPath = path.join(outputDir, newFileName);
        fs.copy(sourcePath, targetPath);
      }
    }


  }

  const getUploadedUrl = (name) => {
    return `${prefix}/${part}/${classify}/${encodeURIComponent(name)}`
  }

  // exec
  if (!assetsPath) {
    console.log(Chalk.red('must be have assets path'))
    process.exit(0)
  }

  try {
    const outputDir = path.resolve(__dirname, '../../output')
    const material = path.resolve(__dirname, '../material/index.json')

    // 获取已生成的素材id记录
    if (fs.existsSync(material)) {
      uuidHashMap = fs.readJsonSync(material);
    }

    if (!fs.existsSync(outputDir)) {
      await mkdir(outputDir)
    }

    await mkdir(path.join(outputDir, '/json'))

    const files = await readdir(assetsPath);

    // step 1 生成模版数据
    const data = await generateJSonPresets(files);


    // 复制粘贴重命名目标文件
    await renameFileWithField(files);

    if (uuidHashMap) {
      fs.writeFile(material, JSON.stringify(uuidHashMap));
    }

    console.log('error path =>', errorPath, `${errorPath.length > 0 ? '🙀' : '🐱'}`)
    fs.writeFileSync(
      path.join(__dirname, '../../output/json', 'test.json'),
      JSON.stringify(data),
      {}
    );

  } catch (error) {
    console.log(Chalk.red(error))
  }
};


run();
