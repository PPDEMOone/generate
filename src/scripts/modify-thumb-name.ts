import path from 'node:path'
import fs from 'fs-extra'
import { readdir, mkdir } from 'fs/promises'
import prompts, { Choice, PromptObject } from 'prompts';
import Chalk from 'chalk'

const reg = new RegExp(/([\s\S]+?)-(\d{1,3}-\d{1,3}|\d{1,3}|texture)-(#.*|.*).(png|jpg|jpeg|svg)$/);


const onCancel = () => {
  console.log(Chalk.red('you exit 🙀'))
  process.exit(0)
}

const run = async () => {
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


  const renameFileWithField = async (files: string[]) => {

    for (const file of files) {
      const patten = file.match(reg);
      if (patten) {
        const name = patten[1];
        const num = patten[2];
        const colorValue = patten[3];
        const fileAffix = patten[4];
        fs.rename(`${assetsPath}/${file}`, `${assetsPath}/${name}-texture-${colorValue}.${fileAffix}`)
      }
    }
  }

  const files = await readdir(assetsPath);

  renameFileWithField(files)

  // exec
  if (!assetsPath) {
    console.log(Chalk.red('must be have assets path'))
    process.exit(0)
  }

};


run();
