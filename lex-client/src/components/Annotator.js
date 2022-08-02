import { Link } from "react-router-dom"

const Annotator = () => {
    return (
        <section>
            <h1>Annotators Page</h1>
            <br />
            <p>Your annotations can be found here</p>
            <Link to="/annotation">Create New Annotation</Link>
            <div className="flexGrow">
                <Link to="/">Home</Link>
            </div>
        </section>
    )
}

export default Annotator