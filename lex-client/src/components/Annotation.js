import { Link } from "react-router-dom"

const Annotation = () => {
    return (
        <section>
            <h1>Annotation Editor</h1>
            <br />
            <p>You can create a new annotation here</p>
            <div className="flexGrow">
                <Link to="/">Home</Link>
            </div>
        </section>
    )
}

export default Annotation