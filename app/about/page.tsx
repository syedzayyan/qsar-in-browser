import ReactMarkdown from 'react-markdown';
import AboutSection from '../../README.md';

export default function About(){
    return(
        <div style = {{marginTop : "40px"}}>
            <ReactMarkdown skipHtml={true} children={AboutSection} />
        </div>
    )
}