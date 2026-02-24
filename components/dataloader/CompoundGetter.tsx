import { useContext, useState, useEffect, useRef } from "react";
import TargetContext from "../../context/TargetContext";
import LigandContext from "../../context/LigandContext";
import Link from "next/link";
import FAQComp from "../ui-comps/FAQComp";
import { Button, Progress, Select, Grid, Paper } from "@mantine/core";
import PieChart from "../tools/toolViz/PieChart";

export default function CompoundGetter() {
  const [unit, setUnit] = useState("Ki");
  const [binding, setBinding] = useState("B");
  const [pieData, setPieData] = useState<any[]>([]);
  const { target, setTarget } = useContext(TargetContext);
  const { ligand, setLigand } = useContext(LigandContext);
  const [ligandSearch, setLigandSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // -----------------------------
  // Fetch pie aggregation data
  // -----------------------------
  useEffect(() => {
    if (!target?.target_id) return;

    const esQuery = {
      index_name: "chembl_activity",
      es_query: JSON.stringify({
        size: 0,
        query: { query_string: { query: `target_chembl_id:${target.target_id}` } },
        aggs: { main_agg: { terms: { field: "standard_type", size: 20, missing: "N/A", order: { _count: "desc" } } } }
      })
    };

    const base64Encoded = btoa(
      unescape(encodeURIComponent(JSON.stringify(esQuery)))
    );

    fetch(
      `https://www.ebi.ac.uk/chembl/interface_api/es_proxy/es_data/get_es_data/${base64Encoded}`
    )
      .then((res) => res.json())
      .then((data) => {
        const buckets =
          data?.es_response?.aggregations?.main_agg?.buckets ?? [];
        setPieData(
          buckets.map((b: any) => ({
            key: b.key,
            value: b.doc_count,
          }))
        );
      })
      .catch(console.error);
  }, [target?.target_id]);

  // -----------------------------
  // Fetch activity data
  // -----------------------------
  async function getFullActivityData(url: string) {
    setLigandSearch(false);
    setLoading(true);

    const chembl_url = "https://www.ebi.ac.uk";
    const results: any[] = [];
    let nextUrl = chembl_url + url;

    while (nextUrl !== chembl_url + "null") {
      const response = await fetch(nextUrl);
      const data = await response.json();

      results.push(...data.activities);
      nextUrl = chembl_url + data.page_meta.next;

      const newProgress =
        (results.length / data.page_meta.total_count) * 100;
      setProgress(newProgress);
    }

    setLigandSearch(true);
    setLoading(false);
    return results;
  }

  function fetchData() {
    getFullActivityData(
      `/chembl/api/data/activity?format=json&target_chembl_id=${target.target_id}&type=${unit}&target_organism=Homo%20sapiens&assay_type=${binding}&relation==`
    ).then((data) => {
      data.forEach((x: any) => {
        x[unit] = x.standard_value;
        x.id = x.molecule_chembl_id;
        delete x.standard_value;
      });
      setLigand(data);
    });

    setTarget({
      ...target,
      activity_columns: [unit],
      data_source: "chembl",
    });
  }

  // -----------------------------
  // Layout
  // -----------------------------
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <h2 style={{ textAlign: "center", marginBottom: 30 }}>
        Small Molecule Getter
      </h2>

      <Grid gutter="xl">
        {/* PIE CHART */}
        <Grid.Col span={{ xs: 12, md: 6 }}>
          <Paper shadow="sm" p="md">
            <h3 style={{ textAlign: "center", marginBottom: 20 }}>
              Associated Bioactivities
            </h3>

            {pieData.length === 0 ? (
              <p style={{ textAlign: "center" }}>Loading chart...</p>
            ) : (
              <PieChart data={pieData} />
            )}
          </Paper>
        </Grid.Col>

        {/* FORM */}
        <Grid.Col span={{ xs: 12, md: 6 }}>
          <Paper shadow="sm" p="md">
            <FAQComp>
              For your specific target select, small molecules will be searched that
              have been tested in assays against your target is filtered. You could
              select the type of assay they have been tested in and the units
              provided. Generally speaking it is best to avoid&nbsp;
              <a href="https://pubs.acs.org/doi/full/10.1021/acs.jcim.4c00049">
                mixing various forms of data types
              </a>
              . Since, Binding Assays are more prevalent with Ki being the preferred
              unit, they are the default.
            </FAQComp>

            <Select
              label="Assay Type"
              value={binding}
              onChange={(v) => v && setBinding(v)}
              data={[
                { value: "B", label: "Binding" },
                { value: "F", label: "Functional" },
                { value: "ADMET", label: "ADMET" },
                { value: "T", label: "Toxicity" },
                { value: "P", label: "Physiochemical" },
                { value: "U", label: "Unclassified" },
              ]}
              mb="md"
            />

            <Select
              label="Unit Type"
              value={unit}
              onChange={(v) => v && setUnit(v)}
              data={[
                { value: "Ki", label: "Ki" },
                { value: "IC50", label: "IC50" },
                { value: "XC50", label: "XC50" },
                { value: "EC50", label: "EC50" },
                { value: "AC50", label: "AC50" },
                { value: "Kd", label: "Kd" },
                { value: "Potency", label: "Potency" },
                { value: "ED50", label: "ED50" },
              ]}
              mb="lg"
            />

            <Button fullWidth onClick={fetchData}>
              Fetch Data
            </Button>

            {loading && (
              <>
                <Progress value={progress} mt="md" />
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  {Math.min(progress, 100).toFixed(1)}%
                </div>
              </>
            )}

            {ligand.length > 0 && (
              <Link href="/tools/preprocess/" passHref>
                <Button fullWidth mt="md">
                  Process Molecules
                </Button>
              </Link>
            )}

            {ligandSearch && ligand.length === 0 && (
              <p style={{ textAlign: "center", marginTop: 20 }}>
                No compounds found.
              </p>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </div>
  );
}