
export default function Loader({ loadingText = 'Processsing...'}){
    return(
        <div style={{textAlign:"center"}}>

            {loadingText}
            <div><div className="loader"></div></div>
        </div>
        
    )
}