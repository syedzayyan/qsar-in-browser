import type { ligand } from './types/ligand';

export default function mergeactivities(activities: ligand[], logstate: boolean): ligand[] {
	const activitymap = new Map<string, ligand>();
	console.log(activities);
	for (const activity of activities) {
		const key = activity.molecule_chembl_id;
        const standard_value = parseFloat(activity.standard_value);
		try {
			// Activity is not there, so set it!
			if (!activitymap.has(key)) {
				activity[`assay_desc_${activity.standard_type}`] = activity.assay_description;
				if (logstate) {
					activity['p' + activity.standard_type] = -1 * Math.log10(standard_value * 10e-9);
				}
				activitymap.set(key, { ...activity });
			}
			// Activity is there so find existing
			const existingactivity = activitymap.get(key)!; // non-null assertion as we just added it if it wasn't there
			if (existingactivity.standard_type != activity.standard_type) {
				activity[`assay_desc_${activity.standard_type}`] = activity.assay_description;
				if (logstate) {
					activity['p' + activity.standard_type] = -1 * Math.log10(standard_value * 10e-9);
				}
				activitymap.set(key, { ...activity });
			}
		} catch (e) {
			console.error(e);
			console.error(key);
		}
	}
	return Array.from(activitymap.values());
}
