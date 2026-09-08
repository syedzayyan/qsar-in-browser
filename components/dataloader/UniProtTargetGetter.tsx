import { useContext, useState } from "react";
import PubChemBioassayGetter from "./PubChemBioassayGetter";
import TargetContext from "../../context/TargetContext";
import NotificationContext from "../../context/NotificationContext";
import { UNIPROT_DOWN_MESSAGE } from "../utils/pubchem";
import { useDisclosure } from '@mantine/hooks';
import { Modal, Loader } from '@mantine/core';
import { Table } from '@mantine/core';
import { Input } from '@mantine/core';

type UniProtHit = {
  accession: string;
  entryName: string;
  proteinName: string;
  organism: string;
};

export default function UniProtTargetGetter() {
  const [targetQuery, setTargetQuery] = useState("");
  const [hits, setHits] = useState<UniProtHit[]>([]);
  const [loading, setLoading] = useState(false);
  const { target, setTarget } = useContext(TargetContext);
  const { pushNotification } = useContext(NotificationContext);

  const [opened, { open, close }] = useDisclosure(false);

  function fetchTarget(e) {
    e.preventDefault();
    setLoading(true);
    fetch(
      `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(targetQuery)}+AND+reviewed:true&fields=accession,id,protein_name,organism_name&format=json&size=25`,
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`UniProt responded with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const results: UniProtHit[] = (data.results || []).map((r: any) => ({
          accession: r.primaryAccession,
          entryName: r.uniProtkbId,
          proteinName:
            r.proteinDescription?.recommendedName?.fullName?.value ||
            r.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
            r.uniProtkbId,
          organism: r.organism?.scientificName || "",
        }));
        setHits(results);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoading(false);
        pushNotification({ type: "warning", message: UNIPROT_DOWN_MESSAGE });
      });
  }

  const resetAll = () => {
    setHits([]);
    setTargetQuery("");
    setLoading(false);
    setTarget({ target_id: "", target_name: "", target_organism: "", data_source: "", pre_processed: false, scaffold_network: "", scaffCores: [] });
  };

  return (
    <div className="data-loaders pubchem-loader container">
      <form
        onSubmit={fetchTarget}
        style={{
          width: "90%",
          display: "flex",
          gap: "10px",
          flexDirection: "column",
        }}
      >
        <h2>Browse protein targets from UniProt</h2>
        <p>
          Search and select your protein target of interest. Once confirmed, QITB will use its
          UniProt accession to pull matching small-molecule bioactivity data from PubChem.
        </p>
        <Input
          placeholder="Search for relevant words to your Target"
          onChange={(e) => setTargetQuery(e.target.value)}
          required={true}
          pattern=".{3,}"
        />
      </form>

      {loading ? (
        <Loader size={100} />
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Protein Name</Table.Th>
              <Table.Th>UniProt Accession</Table.Th>
              <Table.Th>Organism</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {hits.map((hit) => (
              <Table.Tr
                key={hit.accession}
                onClick={() => {
                  setTarget({
                    ...target,
                    target_id: hit.accession,
                    target_name: hit.proteinName,
                    target_organism: hit.organism,
                    pre_processed: false,
                  });
                  open();
                  setHits([]);
                  setTargetQuery("");
                }}
              >
                <Table.Td>{hit.proteinName}</Table.Td>
                <Table.Td>{hit.accession}</Table.Td>
                <Table.Td>{hit.organism}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Modal size="70%" opened={opened} onClose={() => {
        close();
        resetAll();
      }}>
        <PubChemBioassayGetter />
      </Modal>
    </div>
  );
}
