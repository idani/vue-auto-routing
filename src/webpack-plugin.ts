import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import { Compiler } from 'webpack'
import { generateRoutes, GenerateConfig } from 'vue-route-generator'

const pluginName = 'VueAutoRoutingPlugin'

interface Options extends GenerateConfig {
  pageName?: string
}

namespace VueAutoRoutingPlugin {
  export type AutoRoutingOptions = Options
}

class VueAutoRoutingPlugin {
  constructor(private options: Options | Options[]) {
    if (Array.isArray(options)) {
      options.forEach(option => {
        assert(option.pages, '`pages` is required')
        assert(option.pageName, '`pageName` is required')
      })
    } else {
      assert(options.pages, '`pages` is required')
    }
  }

  apply(compiler: Compiler) {
    const generate = (option: Options) => {
      const code = generateRoutes(option)
      const pageName = option.pageName ? option.pageName : 'index'
      const to = path.resolve(__dirname, `../${pageName}.js`);

      if (
        fs.existsSync(to) &&
        fs.readFileSync(to, 'utf8').trim() === code.trim()
      ) {
        return
      }

      fs.writeFileSync(to, code)
    }

    const generateIndex = (options: Options[]) => {
      const importCode:string[] = [];
      const exportCode:string[] = [];
      options.forEach(option => {
        const to = path.resolve(__dirname, `../${option.pageName}.js`);
        if (fs.existsSync(to)){
          importCode.push(`import ${option.pageName} from './${option.pageName}';`)
          exportCode.push(`${option.pageName}`)
        }
      })
      return `${importCode.join("\n")}export{${exportCode.join(',')}}`
    }

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      try {
        if (typeof this.options === 'object') {
          generate(this.options as Options);
        } else if (Array.isArray(this.options)) {
          this.options.forEach(option => {
            generate(option)
          })
          const indexPath = path.resolve(__dirname, '../index.js');
          const code = generateIndex(this.options)
          if (fs.existsSync(indexPath) &&
            fs.readFileSync(indexPath, 'utf8').trim() === code.trim()) {
            return;
          }
          fs.writeFileSync(indexPath, code);
        } else {
          throw new Error('options must be an object or an array')
        }
      } catch (error) {
        compilation.errors.push(error)
      }
    })
  }
}

export = VueAutoRoutingPlugin
