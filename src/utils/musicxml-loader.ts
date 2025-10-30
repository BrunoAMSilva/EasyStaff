import { parseMusicXML } from './music-xml-parser';
import type { Loader } from 'astro/loaders';
import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export function musicXMLLoader(): Loader {
  return {
    name: 'musicxml-loader',
    load: async ({ config, store, logger, parseData, generateDigest, watcher }) => {
      const partituresDir = new URL('src/content/partitures/', config.root);
      const partituresDirPath = fileURLToPath(partituresDir);
      
      // Helper function to load MusicXML files from a directory
      const loadMusicXMLFiles = async (dirPath: string) => {
        try {
          const files = await readdir(dirPath, { withFileTypes: true });
          
          for (const file of files) {
            if (file.isFile() && (file.name.endsWith('.xml') || file.name.endsWith('.musicxml'))) {
              const filePath = join(dirPath, file.name);
              const relativePath = relative(fileURLToPath(config.root), filePath);
              
              try {
                const xmlContent = await readFile(filePath, 'utf-8');
                const parsed = parseMusicXML(xmlContent);
                
                // Generate ID from filename (remove extension)
                const id = file.name.replace(/\.(xml|musicxml)$/, '');
                
                // Parse and validate the data according to collection schema
                const data = await parseData({
                  id,
                  data: parsed as unknown as Record<string, unknown>,
                });
                
                const digest = generateDigest(parsed as unknown as Record<string, unknown>);
                
                store.set({
                  id,
                  data: parsed as unknown as Record<string, unknown>,
                  digest,
                  filePath: relativePath,
                });
                
                logger.info(`Loaded MusicXML: ${file.name}`);
              } catch (error) {
                logger.error(`Failed to parse MusicXML file: ${file.name} - ${error}`);
              }
            }
          }
        } catch (error) {
          logger.error(`Failed to read partitures directory: ${dirPath}`);
        }
      };

      // Initial load
      store.clear();
      await loadMusicXMLFiles(partituresDirPath);

      // Set up file watcher for development
      if (watcher) {
        watcher.on('add', async (filePath) => {
          if ((filePath.endsWith('.xml') || filePath.endsWith('.musicxml')) && 
              filePath.includes('/content/partitures/')) {
            logger.info(`New MusicXML file detected: ${filePath}`);
            await loadMusicXMLFiles(partituresDirPath);
          }
        });

        watcher.on('change', async (filePath) => {
          if ((filePath.endsWith('.xml') || filePath.endsWith('.musicxml')) && 
              filePath.includes('/content/partitures/')) {
            logger.info(`MusicXML file changed: ${filePath}`);
            await loadMusicXMLFiles(partituresDirPath);
          }
        });

        watcher.on('unlink', async (filePath) => {
          if ((filePath.endsWith('.xml') || filePath.endsWith('.musicxml')) && 
              filePath.includes('/content/partitures/')) {
            const fileName = filePath.split('/').pop()?.replace(/\.(xml|musicxml)$/, '');
            if (fileName && store.has(fileName)) {
              store.delete(fileName);
              logger.info(`Removed MusicXML file: ${filePath}`);
            }
          }
        });
      }
    }
  };
}