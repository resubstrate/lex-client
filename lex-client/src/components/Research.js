import { Link } from "react-router-dom"

const Research = () => {
    return (
        <section>
            <h1>Research View</h1>
            <br />
            <p>Admins and Researchers can view all annotations and add new sources.</p>
            <div className="flexGrow">
                <Link to="/">Home</Link>
            </div>
        </section>
    )
}

export default Research