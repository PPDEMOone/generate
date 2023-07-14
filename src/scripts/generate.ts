import path from 'node:path'
import { copySync } from 'fs-extra'
import { readdir, rename, writeFile } from 'fs/promises'
import prompts, { Choice, PromptObject } from 'prompts';
import Chalk from 'chalk'
import uploadToQiniu from '../lib/upload';
const { v4: uuid } = require('uuid');
// const assetsPath = '/Users/ares/Downloads/上衣/Casual/Casual Jackets';
const bucketName = 'sunzi-assets';
const folderPath = 'preload/lego-mini-v2';
const outPutPath = './demo';
const prefix = 'https://assets.sunzi.cool/preload/lego-mini-v2'

// enum PositionMap {
//   '0' = 'body-front',
//   '1' = 'body-back',
//   '2' = 'body-left',
//   '3' = 'body-right',
//   '4' = 'long-sleeves-left',
//   '5' = 'long-sleeves-right'
// }
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
    type: "text",
    name: "assetsPath",
    message: "choose your asset absolute path"
  },
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
    message: '请选择classify 🐶',
    choices: (pre) => {
      if (pre === 'clothes') {
        return clothes
      }
      return pants
    }
  }
];

const run = async () => {
  const response = await prompts(questions, {
    onCancel: () => {
      console.log(Chalk.red('you exit 🙀'))
      process.exit(0)
    }
  });

  const { classify, part, assetsPath } = response;
  const realPath = `${folderPath}/${part}/${classify}`

  console.log(response);

  const getUploadedUrl = (name) => {
    return `${prefix}/${part}/${classify}/${encodeURIComponent(name)}`
  }

  const generateJSonPresets = async () => {
    if (!assetsPath) {
      console.log(Chalk.red('must be have assets path'))
      process.exit()
    }

    const files = await readdir(assetsPath);
    const images = files.filter((file) => /\.(png|jpg|jpeg|svg)$/i.test(file));
    const assetsMap = {}
    const errorPath: string[] = [];

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
    // step 1
    while (images.length > 0) {
      const fileName = images.shift() ?? "";
      const reg = new RegExp(/([\s\S]+?)-(\d{1,3}-\d{1,3}|\d{1,3})-#(.*).png/);
      const patten = fileName.match(reg);

      if (!patten) {
        errorPath.push(fileName);
        continue;
      }
      const name = patten[1];
      const color = patten[3];
      const positionNum = patten[2];

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

    // step 2
    const json = Object.entries(assetsMap).map(([name, value], index) => {
      const colorOptions = value as object;
      const colors = Object.entries(colorOptions).map(([color, colorPositionMap]) => {
        // console.log(color, colorPositionMap);
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
          color: color,
          value: color,
          // decals
        }
      })

      return {
        id: uuid(),
        name: name,
        thumb: "",
        colors
      }
    })
    return [JSON.stringify(json)]
  };

  const json = await generateJSonPresets();

  writeFile(
    path.resolve(__dirname, '../demo', 'test.json'),
    JSON.stringify(json)
  );
};


run();
