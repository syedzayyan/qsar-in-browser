import { ksTest } from '$lib/components/utils/ksTest';

console.log('MMA Worker Activated');

// Cache URLs for better readability
const rdkitScriptUrl = new URL('/rdkit/RDKit_minimal.js', self.location.origin).href;
const rdkitWasmUrl = new URL('/rdkit/RDKit_minimal.wasm', self.location.origin).href;

// Progress reporting helper function
const reportProgress = (message, current, total) => {
  if (total) {
    self.postMessage({ 
      message: `${message}: ${Math.round((current / total) * 100)}%` 
    });
  } else {
    self.postMessage({ message });
  }
};

self.onmessage = async (event) => {
  try {
    // Dynamic import for the RDKit script
    await import(/* @vite-ignore */ rdkitScriptUrl);
    
    const RDKitInstance = await initRDKitModule({
      locateFile: () => rdkitWasmUrl
    });
    
    reportProgress(`${RDKitInstance.version()} Loaded`);
    reportProgress('Churning Out Scaffolds');
    
    const row_list_s = event.data;
    const activity_name = Object.keys(row_list_s[0])[0];
    const curr_activity_column = row_list_s.map(obj => obj[activity_name]);
    const length_row_list = row_list_s.length;
    
    // Process molecular data - using Promise.all for potential parallelization
    const massive_array = [];
    
    // Process molecules in batches for better UI responsiveness
    const BATCH_SIZE = 10;
    for (let i = 0; i < length_row_list; i += BATCH_SIZE) {
      const batch = row_list_s.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (x, batchIndex) => {
        const globalIndex = i + batchIndex;
        reportProgress('Decomposing SMILES', globalIndex, length_row_list);
        
        try {
          const mol = RDKitInstance.get_mol(x.canonical_smiles);
          const sidechains_smiles_list = [];
          const cores_smiles_list = [];
          
          try {
            const mol_frags = mol.get_mmpa_frags(1, 1, 20);
            
            // Use a cleaner while loop with proper cleanup
            while (!mol_frags.sidechains.at_end()) {
              const m = mol_frags.sidechains.next();
              const { molList } = m.get_frags();
              
              try {
                const fragments = [];
                while (!molList.at_end()) {
                  const m_frag = molList.next();
                  fragments.push(m_frag.get_smiles());
                  m_frag.delete(); // Clean up immediately
                }
                
                if (fragments.length >= 2) {
                  cores_smiles_list.push(fragments[0]);
                  sidechains_smiles_list.push(fragments[1]);
                  
                  const qmol = RDKitInstance.get_qmol(fragments[0]);
                  try {
                    const mdetails2 = JSON.parse(mol.get_substruct_match(qmol));
                    
                    massive_array.push([
                      x.canonical_smiles,
                      fragments[0],
                      mol.get_svg_with_highlights(JSON.stringify(mdetails2)),
                      x.id,
                      x[activity_name]
                    ]);
                  } catch (e) {
                    console.error('Substruct match error:', e);
                  } finally {
                    qmol.delete(); // Ensure qmol is deleted even if there's an error
                  }
                }
              } catch (e) {
                console.error('Fragment processing error:', e);
              } finally {
                m.delete();
                molList.delete(); // Clean up resources
              }
            }
            
            // Clean up mol_frags resources
            mol_frags.cores.delete();
            mol_frags.sidechains.delete();
          } catch (e) {
            console.error('MMPA fragments error:', e);
          } finally {
            // Update the row data
            row_list_s[globalIndex]['Cores'] = cores_smiles_list;
            row_list_s[globalIndex]['R_Groups'] = sidechains_smiles_list;
            mol.delete(); // Ensure mol is deleted even if there's an error
          }
        } catch (e) {
          console.error(`Error processing SMILES at index ${globalIndex}:`, e);
        }
      }));
    }
    
    reportProgress("Done Decomposing");
    
    // Count and group structures more efficiently
    const countMap = new Map();
    for (const item of massive_array) {
      if (item.length < 5) continue;
      
      const scaffold = item[1];
      const activity = item[4];
      
      if (!countMap.has(scaffold)) {
        countMap.set(scaffold, { count: 0, activities: [] });
      }
      
      const entry = countMap.get(scaffold);
      entry.count++;
      entry.activities.push(activity);
    }
    
    reportProgress("Sorting Arrays using KS Statistics");
    
    // Process scaffolds in parallel where possible
    let scaffoldArray = Array.from(countMap.entries())
      .filter(([scaffold, data]) => data.count >= 2 && scaffold.length > 9)
      .map(([scaffold, data]) => [scaffold, [data.count, data.activities]]);
    
    const filter_len = scaffoldArray.length;
    
    // Process scaffolds in batches
    const STAT_BATCH_SIZE = 20;
    const processedScaffolds = [];
    
    for (let i = 0; i < filter_len; i += STAT_BATCH_SIZE) {
      const batch = scaffoldArray.slice(i, i + STAT_BATCH_SIZE);
      
      const batchResults = await Promise.all(batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex;
        reportProgress("Calculating KS Statistics", globalIndex, filter_len);
        
        const [scaffold, [count, activities]] = item;
        try {
          const mol = RDKitInstance.get_mol(scaffold);
          const svg = mol.get_svg();
          mol.delete();  // Clean up
          
          return [scaffold, [count, ksTest(activities, curr_activity_column)], svg];
        } catch (e) {
          console.error(`Error processing scaffold SVG for ${scaffold}:`, e);
          return [scaffold, [count, ksTest(activities, curr_activity_column)], ""];
        }
      }));
      
      processedScaffolds.push(...batchResults);
    }
    
    // Sort by KS statistic
    processedScaffolds.sort((a, b) => a[1][1] - b[1][1]);
    
    const scaffoldResult = [processedScaffolds, massive_array];
    reportProgress('Done....');
    self.postMessage({ data: scaffoldResult });
    
  } catch (error) {
    console.error('Critical worker error:', error);
    self.postMessage({ error: error.message });
  }
};
