import { readdirSync } from 'fs'
import path from 'path'


export  function loadPlugins() {
  const files =  readdirSync(path.resolve(__dirname, '../src/middlewares/plugins'));
  const imports = files.filter(file => file.endsWith('.js')).map(file => (
    require(path.resolve(__dirname, '../src/middlewares/plugins',  file))))

  const moduleNames: { [name: string]: number } = {};
  const modules: unknown[] = [];
  for (const i in imports) {
    Object.keys(imports[i]).forEach((key: string) => {
      moduleNames[key] = modules.length;
      modules.push(imports[i][key])
    })
  }
  return [moduleNames, modules] as [{ [name: string]: number }, any[]];
}