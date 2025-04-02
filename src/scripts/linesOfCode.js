const fs = require('fs');
const path = require('path');
const { color, getTimestamp, textEffects } = require('../utils/loggingEffects');
const { asciiCodeBaseStats } = require('../lib/asciiText.js');

/**
 * 
 * @param {string} directoryPath 
 * @param {Array} extensions 
 * @returns {Object} 
 */

function countLinesOfCode(directoryPath, extensions = ['.js']) {
    let stats = {
        totalFiles: 0,
        totalLines: 0,
        totalBlankLines: 0,
        totalCommentLines: 0,
        totalCodeLines: 0,
        filesByExtension: {}
    };

    extensions.forEach(ext => {
        stats.filesByExtension[ext] = {
            count: 0,
            lines: 0
        };
    });

    function processDirectory(dirPath) {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory() && !file.startsWith('node_modules')) {

                processDirectory(filePath);
            } else {
                const ext = path.extname(file).toLowerCase();

                if (!extensions.includes(ext)) continue;

                stats.totalFiles++;
                stats.filesByExtension[ext].count++;

                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');
                
                stats.totalLines += lines.length;
                stats.filesByExtension[ext].lines += lines.length;

                let blankLines = 0;
                let commentLines = 0;

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    
                    if (trimmedLine === '') {
                        blankLines++;
                    } else if (trimmedLine.startsWith('//') || 
                               trimmedLine.startsWith('/*') || 
                               trimmedLine.startsWith('*') || 
                               trimmedLine.endsWith('*/')) {
                        commentLines++;
                    }
                }

                stats.totalBlankLines += blankLines;
                stats.totalCommentLines += commentLines;
            }
        }
    }

    processDirectory(directoryPath);

    stats.totalCodeLines = stats.totalLines - stats.totalBlankLines - stats.totalCommentLines;

    return stats;
}

asciiCodeBaseStats()

const srcDirectory = path.join(__dirname, '..');
console.log(`${color.blue}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] Analyzing code in ${srcDirectory}...`);

try {
    const stats = countLinesOfCode(srcDirectory, ['.js', '.jsx', '.ts', '.tsx']);
    
    console.log(`${color.pink}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] Analysis complete!`);
    console.log(`${color.pink}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] Total files: ${textEffects.bold}${stats.totalFiles}${textEffects.reset}`);
    console.log(`${color.pink}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] Total lines: ${textEffects.bold}${stats.totalLines}${textEffects.reset}`);
    console.log(`${color.pink}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] Code lines: ${textEffects.bold}${stats.totalCodeLines}${textEffects.reset}`);
    console.log(`${color.pink}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] Comment lines: ${textEffects.bold}${stats.totalCommentLines}${textEffects.reset}`);
    console.log(`${color.pink}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] Blank lines: ${textEffects.bold}${stats.totalBlankLines}${textEffects.reset}`);

    console.log(`${color.pink}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] ${color.darkGrey}${textEffects.underline}Statistics by file extension: ${textEffects.reset}${color.reset}`);
    for (const [ext, data] of Object.entries(stats.filesByExtension)) {
        if (data.count > 0) {
            console.log(`${color.pink}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] ${textEffects.bold}${ext}${textEffects.reset}: ${textEffects.bold}${data.count}${textEffects.reset} files, ${textEffects.bold}${data.lines}${textEffects.reset} lines`);
        }
    }
} catch (error) {
    console.error(`${color.red}[${getTimestamp()}]${color.reset} [LINES_OF_CODE] Error analyzing code:`, error);
}
