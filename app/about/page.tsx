import ReactMarkdown from 'react-markdown';
import AboutSection from '../../README.md';

export default function About(){
    return(
        <div className='container'>
            <div className="content-wrapper" style = {{minHeight : "100vh"}}>
                <div>
                    <ReactMarkdown skipHtml={false} children={AboutSection} />
                </div>
            </div>
        </div>
    )
}