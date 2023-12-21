// To run: npx tsx src/install.ts

import fs from 'node:fs/promises';
import path from 'node:path';

import { DOMParser } from '@xmldom/xmldom';

// Change this as needed
const gamePath = path.join(
  process.env.HOME ?? '',
  "/.steam/steam/steamapps/common/Sid Meier's Civilization IV Beyond the Sword"
);

const btsDirectory = 'Beyond the Sword';
const modName = 'Micro Civ 4';
const modsDirectory = 'Mods';

const btsPath = path.join(gamePath, btsDirectory);
const modPath = path.join(btsPath, modsDirectory, modName);

const main = async () => {
  // Start with a clean slate every time
  await uninstallMod();
  await modMapSizes();
  await modGameOptions();
  await modCivics();
  // await removeReligion();
  // await removeEspionage();
  // await removeCorporations();
};

const uninstallMod = async () => {
  await fs.rm(modPath, {
    force: true,
    recursive: true,
  });
};

const modMapSizes = async () => {
  const worldInfoFile = 'Assets/XML/GameInfo/CIV4WorldInfo.xml';
  const modFilePath = await prepModFile(worldInfoFile);

  const doc = new DOMParser().parseFromString(
    (await fs.readFile(modFilePath)).toString(),
    'text/xml'
  );

  let newGridHeight = 3;
  let newGridWidth = 3;

  const worldInfos = doc.getElementsByTagName('WorldInfo');
  // This seems to be necessary since the return value of getElementsByTagName() isn't an
  // iterator
  for (let i = 0; i < worldInfos.length; i++) {
    const worldInfo = worldInfos[i];

    const iGridHeight = worldInfo.getElementsByTagName('iGridHeight')[0];
    iGridHeight.childNodes[0].textContent = String(newGridHeight);
    newGridHeight++;

    const iGridWidth = worldInfo.getElementsByTagName('iGridWidth')[0];
    iGridWidth.childNodes[0].textContent = String(newGridWidth);
    newGridWidth++;
  }

  // Replace normal newlines with Windows newlines; this probably isn't necessary but
  // makes diffing easier since the original files have Windows newlines
  await fs.writeFile(modFilePath, doc.toString().replaceAll('\n', '\r\n'));
};

const modGameOptions = async () => {
  const gameOptionsFile = 'Assets/XML/GameInfo/CIV4GameOptionInfos.xml';
  const modFilePath = await prepModFile(gameOptionsFile);

  const doc = new DOMParser().parseFromString(
    (await fs.readFile(modFilePath)).toString(),
    'text/xml'
  );

  const gameOptionInfos = doc.getElementsByTagName('GameOptionInfo');
  for (let i = 0; i < gameOptionInfos.length; i++) {
    const gameOptionInfo = gameOptionInfos[i];

    const typeElement = gameOptionInfo.getElementsByTagName('Type')[0];
    if (
      typeElement.childNodes[0].textContent &&
      [
        'GAMEOPTION_NO_CITY_RAZING',
        'GAMEOPTION_NO_VASSAL_STATES',
        'GAMEOPTION_NO_ESPIONAGE',
      ].includes(typeElement.childNodes[0].textContent)
    ) {
      const bDefault = gameOptionInfo.getElementsByTagName('bDefault')[0];
      bDefault.childNodes[0].textContent = '1';
    }

    if (
      typeElement.childNodes[0].textContent &&
      [
        // Hide pick religion from options since we'll be removing religion
        'GAMEOPTION_PICK_RELIGION',
      ].includes(typeElement.childNodes[0].textContent)
    ) {
      const bVisible = gameOptionInfo.getElementsByTagName('bVisible')[0];
      bVisible.childNodes[0].textContent = '0';
    }
  }

  await fs.writeFile(modFilePath, doc.toString().replaceAll('\n', '\r\n'));
};

const modCivics = async () => {
  const removedCivicOptions = await removeCivicOptions();

  // const civicsFile = 'Assets/XML/GameInfo/CIV4CivicInfos.xml';
  // const civicsFilePath = await prepModFile(civicsFile);

  // const civicsXmlDoc = new DOMParser().parseFromString(
  //   (await fs.readFile(civicsFilePath)).toString(),
  //   'text/xml'
  // );

  // const civicInfos = civicsXmlDoc.getElementsByTagName('CivicInfo');
  // for (let i = 0; i < civicInfos.length; i++) {
  //   const civicInfo = civicInfos[i];

  //   const typeElement = civicInfo.getElementsByTagName('Type')[0];
  //   if (
  //     typeElement.childNodes[0].textContent &&
  //     [
  //       'GAMEOPTION_NO_CITY_RAZING',
  //       'GAMEOPTION_NO_VASSAL_STATES',
  //       'GAMEOPTION_NO_ESPIONAGE',
  //     ].includes(typeElement.childNodes[0].textContent)
  //   ) {
  //     const bDefault = civicInfo.getElementsByTagName('bDefault')[0];
  //     bDefault.childNodes[0].textContent = '1';
  //   }

  //   if (
  //     typeElement.childNodes[0].textContent &&
  //     [
  //       // Hide pick religion from options since we'll be removing religion
  //       'GAMEOPTION_PICK_RELIGION',
  //     ].includes(typeElement.childNodes[0].textContent)
  //   ) {
  //     const bVisible = civicInfo.getElementsByTagName('bVisible')[0];
  //     bVisible.childNodes[0].textContent = '0';
  //   }
  // }

  // await fs.writeFile(
  //   civicOptionsFilePath,
  //   civicsXmlDoc.toString().replaceAll('\n', '\r\n')
  // );
};

const removeCivicOptions = async () => {
  const civicOptionsFile = 'Assets/XML/GameInfo/CIV4CivicOptionInfos.xml';
  const civicOptionsFilePath = await prepModFile(civicOptionsFile);

  const civicOptionsXmlDoc = new DOMParser().parseFromString(
    (await fs.readFile(civicOptionsFilePath)).toString(),
    'text/xml'
  );

  const civicOptionInfos =
    civicOptionsXmlDoc.getElementsByTagName('CivicOptionInfos')[0];
  const civicOptionInfosChildren =
    civicOptionInfos.getElementsByTagName('CivicOptionInfo');
  for (let i = 0; i < civicOptionInfosChildren.length; i++) {
    const civicOptionInfo = civicOptionInfosChildren[i];

    const typeElement = civicOptionInfo.getElementsByTagName('Type')[0];
    if (
      typeElement.childNodes[0].textContent &&
      ![
        'CIVICOPTION_GOVERNMENT',
        // Planetfall
        'CIVICOPTION_POLITICS',
      ].includes(typeElement.childNodes[0].textContent)
    ) {
      console.log('here');
      civicOptionInfos.removeChild(civicOptionInfo);
    }
  }

  // console.log(civicOptionInfos.toString());
  console.log(civicOptionsXmlDoc.toString());

  // await fs.writeFile(
  //   civicOptionsFilePath,
  //   civicsXmlDoc.toString().replaceAll('\n', '\r\n')
  // );
};

/**
 * Make sure the asset file at the given path exists in the mod, otherwise copy it from
 * the game files. Then return the full path to the file in the mod.
 *
 * @param assetPath The partial path of the file to check, starting with "Assets/"
 * @returns The full path of the file in the mod
 */
const prepModFile = async (assetPath: string): Promise<string> => {
  if (!assetPath.startsWith('Assets/')) {
    throw new Error(`Asset file does not start with "Assets/": ${assetPath}`);
  }

  const modFilePath = path.join(modPath, assetPath);

  // First, see if the file already exists
  if (await doesFileExist(modFilePath)) {
    return modFilePath;
  }

  // If not, and the file exists in BtS, copy it to the mod
  if (await doesFileExist(path.join(btsPath, assetPath))) {
    await copyFile(path.join(btsPath, assetPath), modFilePath);
    return modFilePath;
  }

  // If not, and the file exists in the base game directory, copy it to the mod
  if (await doesFileExist(path.join(gamePath, assetPath))) {
    await copyFile(path.join(gamePath, assetPath), modFilePath);
    return modFilePath;
  }

  throw new Error(`File to mod not found in game directory:  ${assetPath}`);
};

const doesFileExist = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const copyFile = async (sourcePath: string, destPath: string) => {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.copyFile(sourcePath, destPath);
};

main().then(() => {});
