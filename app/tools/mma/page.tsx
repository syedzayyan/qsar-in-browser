"use client"
import MMA from "../../../components/tools/toolComp/MMA";
import FAQComp from "../../../components/ui-comps/FAQComp";

export default function Matched() {
    return (
        <div className="tools-container">
            <h1>Common Motifs</h1>
            <h3>Matched Molecular Series - Analysis</h3>
            <details open={false}>
                <summary>How to interpret these results</summary>
                <p>
                    QITB groups molecules that share a core structure but vary elsewhere in their structure.
                    You can see how many 'Matched Molecules' there are per group. Via the highlight, you can
                    see the location of the common motif in each molecule.
                </p>
            </details>

            <details open={false}>
                <summary>How are common motifs calculated?</summary>

                QITB groups molecules that share the same core structure by using Matched Molecular Series Analysis which you can read more about here:
                <ul>
                    <li>Wawer, Mathias, and Jürgen Bajorath.
                        "Local structural changes, global data views: graphical substructure− activity relationship trailing."
                        Journal of Medicinal Chemistry 54 (2011): 2944-2951.&nbsp;
                        <a href="https://doi.org/10.1021/jm200026b">Link</a>
                    </li>
                    <li>
                        O’Boyle, Noel M., Jonas Boström, Roger A. Sayle, and Adrian Gill.
                        "Using matched molecular series as a predictive tool to optimize biological activity."
                        Journal of Medicinal Chemistry, 57 (2014): 2704-2713.&nbsp;
                        <a href="https://doi.org/10.1021/jm500022q">Link</a>
                    </li>
                </ul>
            </details>
            <MMA />
        </div>
    )
}