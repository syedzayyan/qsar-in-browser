import type { Ligand } from './types/ligand';

export default function mergeActivities(activities: Ligand[], logState: boolean): Ligand[] {
	const activityMap = new Map<string, Ligand>();
	for (const activity of activities) {
		const key = activity.molecule_chembl_id;

		if (!activityMap.has(key)) {
			activityMap.set(key, activity);
		}

		const existingActivity = activityMap.get(key);

		if (activity.standard_type && activity.standard_value) {
			const standardValue: number = parseFloat(activity.standard_value);
			// Assign to the appropriate standard type field
			existingActivity[activity.standard_type] = standardValue;

            if (logState) {
			    existingActivity["p" + activity.standard_type] = -1 * Math.log10(standardValue * 10e-9);
            }

			// Assign the assay description to the appropriate field
			if (activity.assay_description) {
				existingActivity[`assay_desc_${activity.standard_type}`] = activity.assay_description;
			}
		}
	}
	return Array.from(activityMap.values());
}
