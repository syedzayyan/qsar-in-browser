import { useForm } from "react-hook-form"

type XGBoostModelInputs = {
    max_depth: number,
    min_child_weight: number,
    subsample: number,
    colsample_bytree: number,
    learning_rate: number,
    n_jobs: number
}

export default function XGB({onSubmit}){
    const { register, handleSubmit, watch, formState: { errors }, } = useForm<XGBoostModelInputs>()
    return (
        <form className="ml-forms" onSubmit={handleSubmit(onSubmit)}>
        <p>The python XGBoost library is used. You could consult those docs
            for clarity
        </p>
        <label className="form-labels" htmlFor="learning_rate">Learning Rate: &nbsp;</label>
        <input className="input" id="learning_rate" type="number" defaultValue={0.15} {...register("learning_rate")} />
        <br />
        <label className="form-labels" htmlFor="max_depth">Maximum Depth: &nbsp;</label>
        <input className="input" id="max_depth" type="number" defaultValue={8} {...register("max_depth")} />
        <br />
        <label className="form-labels" htmlFor="min_child_weight">Minimum Child Weight: &nbsp;</label>
        <input className="input" id="min_child_weight" type="number" defaultValue={7} {...register("min_child_weight")} />
        <br />
        <label className="form-labels" htmlFor="subsample">Subsample: &nbsp;</label>
        <input className="input" id="subsample" type="number" defaultValue={1} {...register("subsample")} />
        <br />
        <label className="form-labels" htmlFor="colsample_bytree">colsample_bytree: &nbsp;</label>
        <input className="input" id="colsample_bytree" type="number" defaultValue={1} {...register("colsample_bytree")} />
        <br />
        <label className="form-labels" htmlFor="n_jobs">Number of CPUs: &nbsp;</label>
        <input className="input" id="n_jobs" type="number" defaultValue={2} {...register("n_jobs", { required: true })} />
        <br />
        <br />
        <input value={"Train and Test XGBoost Model"} className="button" type="submit" />
    </form>
    )
}