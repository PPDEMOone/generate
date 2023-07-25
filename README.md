```json
└── src
    ├── lib
    │   └── upload.ts
    ├── material
    │   └── index.json // 该目录存放已生成过素材id 勿删
    └── scripts
        ├── generate.thumb.ts
        └── generate.ts
```

```shell
yarn generate  // 生成json数据 每次生成会记录素材id

? enter your asset absolute path ›  /Users/ares/Desktop/Casual Jackets // 输入素材对应文件夹

? 请选择part 🐱 › - Use arrow-keys. Return to submit. // 选择生成素材的部位
❯   clothes
    pants

```

```json
└── src
    └── output
        ├── json
        ├── material 素材各部位图片 
        └── thumbs 素材预览图
```