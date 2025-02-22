  export default async function getFullActivityData(
      target_id: string,
      unit: string,
      binding: string,
      reactive_progress_state: any,
      homo_sapiens = true,
  ){
    const chembl_url = "https://www.ebi.ac.uk";
    const api_url = 
      `/chembl/api/data/activity?format=json&target_chembl_id=${target_id}&type=${unit}${homo_sapiens ? "&target_organism=Homo%20sapiens" : ""}&assay_type=${binding}`;
    const results = [{}];
    let nextUrl = chembl_url + api_url;

    while (nextUrl !== chembl_url + "null") {
      const response = await fetch(nextUrl);
      const data = await response.json();
      results.push(...data.activities);
      nextUrl = chembl_url + data.page_meta.next;
      const newProgress = (results.length / data.page_meta.total_count) * 100;
      reactive_progress_state.set(newProgress);
    }
    return results.slice(1);
  }
