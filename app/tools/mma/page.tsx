"use client"
import MMA from "../../../components/tools/toolComp/MMA";
import FAQComp from "../../../components/ui-comps/FAQComp";

export default function Matched(){
    return(
        <div className="tools-container">
            <h1>Matched Molecular Series - Analysis</h1>
            <FAQComp >
                <h4>What is Matched Molecular Series?</h4>
                <p>Matched Molecular Series simply put is a method through which molecules are cut in one place, and then it
                    is checked which molecules sort of shair common cores. This is can help find molecules that are very similar
                    to each other, and only differing by a common atom for example. This helps to understand and find out activity cliffs
                    in the data. Activity cliffs are basically molecules where small changes lead to big changes in activity.
                    More about Activity cliffs can be found here: <a href = "https://pubs.acs.org/doi/10.1021/acsomega.9b02221">Link</a>
                </p>
                <h4>How is it done?</h4>
                <p>MMA has appeared in literature and some of the more prominent ones are listed here:
                    <ul>
                        <li>Wawer, Mathias, and Jürgen Bajorath. 
                            "Local structural changes, global data views: graphical substructure− activity relationship trailing." 
                            Journal of Medicinal Chemistry 54 (2011): 2944-2951.&nbsp;
                            <a href = "https://doi.org/10.1021/jm200026b">Link</a>
                        </li>
                        <li>
                            O’Boyle, Noel M., Jonas Boström, Roger A. Sayle, and Adrian Gill. 
                            "Using matched molecular series as a predictive tool to optimize biological activity." 
                            Journal of Medicinal Chemistry, 57 (2014): 2704-2713.&nbsp;
                            <a href = "https://doi.org/10.1021/jm500022q">Link</a>
                        </li>
                    </ul>
                </p>
            </FAQComp>
            <MMA />
        </div>
    )
}