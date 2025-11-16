"use client"

import { useContext, useState } from "react";
import PyodideContext from "../../../../context/PyodideContext";
import RF from "../../../../components/ml-forms/RF";
import MLUtils from "../utils";
import Loader from "../../../../components/ui-comps/Loader";
import XGB from "../../../../components/ml-forms/XGB";
import { Tabs } from "@mantine/core";
import LigandContext from "../../../../context/LigandContext";
import TargetContext from "../../../../context/TargetContext";

export default function RandomForest() {
    const { pyodide } = useContext(PyodideContext);

    globalThis.opts = 1;



    const { ligand } = useContext(LigandContext);
    const { target } = useContext(TargetContext);

    async function onSubmit(data) {
        const msg = {
            id: "job-123",
            opts: 0,
            fp: ligand.map(mol => mol.fingerprint),
            params: {...data, activity_columns: ligand.map((obj) => obj[target.activity_columns[0]])},
            func: "ml"
        };

        pyodide.postMessage(msg);
    }

    return (
        <div>
            <h1>Random Forest</h1>
            <Tabs defaultValue="random-forest">
                <Tabs.List>
                    <Tabs.Tab value="random-forest">
                        Random Forest
                    </Tabs.Tab>
                    <Tabs.Tab value="xgboost" >
                        XGBoost
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="random-forest">
                    <RF onSubmit={onSubmit} />
                </Tabs.Panel>

                <Tabs.Panel value="xgboost">
                    <XGB onSubmit={onSubmit} />
                </Tabs.Panel>
            </Tabs>
        </div>
    )
}