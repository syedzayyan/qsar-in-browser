import { useContext, useState } from "react";
import dummyData from "../utils/data.json";
import CompoundGetter from "./CompoundGetter";
import TargetContext from "../../context/TargetContext";
import Loader from "../ui-comps/Loader";
import { useDisclosure } from '@mantine/hooks';
import { Modal, Button } from '@mantine/core';
import { Table } from '@mantine/core';
import { Input, TextInput } from '@mantine/core';

export default function TargetGetter() {
  const [targetQuery, setTargetQuery] = useState("");
  const [targetDetails, setTargetDetails] = useState(dummyData.targets);
  const [loading, setLoading] = useState(false);
  const { target, setTarget } = useContext(TargetContext);

   const [opened, { open, close }] = useDisclosure(false);

  function fetchTarget(e) {
    setLoading(true);
    fetch(
      `https://www.ebi.ac.uk/chembl/api/data/target/search?format=json&q=${targetQuery}`,
    )
      .then((response) => response.json())
      .then((data) => {
        let target_data = data.targets;
        setTargetDetails(target_data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
    e.preventDefault();
  }

  return (
    <div className="data-loaders chembl-loader container">
      <form
        onSubmit={(e) => fetchTarget(e)}
        style={{
          width: "90%",
          display: "flex",
          gap: "10px",
          flexDirection: "column",
        }}
      >
        <h2>ChEMBL Data Fetcher</h2>
        <Input
          placeholder="Search for relevant words to your Target"
          onChange={(e) => setTargetQuery(e.target.value)}
          defaultValue={target.target_name}
          required={true}
          pattern=".{3,}"
        />
        <Input
          type="submit"
          onSubmit={fetchTarget}
          className="button"
          value="Search for your Target"
        />
      </form>
      <div
        style={{
          overflow: "scroll",
          height: "300px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {loading ? (
          <Loader />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Target Name</Table.Th>
                <Table.Th>ChEMBL ID</Table.Th>
                <Table.Th>Organism</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {targetDetails.map((tars) => (
                <Table.Tr
                  key={tars.target_chembl_id}
                  onClick={() => {
                    setTarget({
                      ...target,
                      target_id: tars.target_chembl_id,
                      target_name: tars.pref_name,
                      target_organism: tars.organism,
                      pre_processed: false,
                    });
                    open();
                  }}
                >
                  <Table.Td>{tars.pref_name}</Table.Td>
                  <Table.Td>{tars.target_chembl_id}</Table.Td>
                  <Table.Td>{tars.organism}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>
      <Modal opened={opened} onClose={close}>
        <CompoundGetter />
      </Modal>
    </div>
  );
}
