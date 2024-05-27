const sdfFileParser = (molecule) => {
    const lines = molecule.split('\n');
    let molData = [];
    let fields = {};
    let inMolData = true;
    let fieldName = null;

    lines.forEach(line => {
        line = line.trimStart(); // Trim whitespace characters from the beginning of the line
        if (inMolData) {
            if (line.startsWith('M  END')) {
                molData.push(line);
                inMolData = false;
            } else {
                molData.push(line);
            }
        } else {
            if (line.startsWith('> <')) {
                const match = line.match(/> <(.*)>/);
                if (match) {
                    fieldName = match[1];
                }
            } else if (fieldName) {
                fields[fieldName] = line.trim();
                fieldName = null;
            }
        }
    });

    return {
        molData: molData.join('\n'),
        ...fields
    };
};

export default sdfFileParser;