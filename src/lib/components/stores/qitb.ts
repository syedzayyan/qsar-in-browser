import type { Ligand } from '../utils/types/ligand';
import type { Target } from '../utils/types/target';
import { persistent } from './persistent';

export const QITB = persistent<{
	data_source: string;
	activity_columns: string[];
	species: string;
	ligand_data: Ligand[];
    logged_once: boolean;
	target_data?: Target;
}>('qitb', {
	data_source: 'Nothing',
	activity_columns: ['Nothing'],
	species: 'Nothing',
    logged_one: true,
	ligand_data: []
});
