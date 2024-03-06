import { useForm } from "react-hook-form"

type RFModelInputs = {
    n_estimators: number,
    criterion: string,
    max_features: string,
    n_jobs: number,
}

export default function RF({onSubmit}) {
    const { register, handleSubmit, watch, formState: { errors }, } = useForm<RFModelInputs>()

    return(
        <form className="ml-forms" onSubmit={handleSubmit(onSubmit)}>
        <p>The Python Scikit Learn with the Random Forest Regressor is used. You could consult those docs
            for clarity
        </p>
        <label className="form-labels" htmlFor="n_estimators">Number of Estimators: &nbsp;</label>
        <input id="n_estimators" className="input" type="number" defaultValue={120} {...register("n_estimators")} />
        <br />
        <label className="form-labels" htmlFor="criterion">Criterion: &nbsp;</label>
        <select id="criterion" className="input" defaultValue={1} {...register("criterion", { required: true })}>
            <option value="squared_error">squared_error</option>
            <option value="absolute_error">absolute_error</option>
            <option value="friedman_mse">friedman_mse</option>
            <option value="poisson">poisson</option>
        </select>
        <br />
        <label className="form-labels" htmlFor="max_features">Maximum Features: &nbsp;</label>
        <select id="max_features" className="input" defaultValue={1} {...register("max_features", { required: true })}>
            <option value="sqrt">sqrt</option>
            <option value="log2">log2</option>
            <option value="None">None</option>
        </select>
        <br />
        <label className="form-labels" htmlFor="n_jobs">Number of CPUs: &nbsp;</label>
        <input id="n_jobs" className="input" type="number" defaultValue={2} {...register("n_jobs", { required: true })} />
        <br />
        <br />
        <input value={"Train and Test RF Model"} className="button" type="submit" />
    </form>
    )
}