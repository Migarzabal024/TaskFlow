import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, Link } from "react-router-dom";
import * as taskService from "../services/taskService";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";

export default function TaskEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    taskService
      .getTask(id)
      .then((task) => {
        reset({
          title: task.title,
          description: task.description || "",
          dueDate: task.dueDate,
          dueTime: task.dueTime || "",
          priority: task.priority,
        });
      })
      .catch((err) => setServerError(err.message))
      .finally(() => setLoading(false));
  }, [id, reset]);

  async function onSubmit(values) {
    setServerError("");
    try {
      await taskService.updateTask(id, {
        title: values.title,
        description: values.description || null,
        dueDate: values.dueDate,
        dueTime: values.dueTime || null,
        priority: values.priority,
      });
      navigate(`/app/tasks/${id}`);
    } catch (err) {
      setServerError(err.message);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Editar tarea</h1>
        <Link to={`/app/tasks/${id}`} className="btn btn-outline btn-sm">
          Cancelar
        </Link>
      </div>
      <form className="form card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorAlert message={serverError} />
        <div className="form-group">
          <label htmlFor="title">Título</label>
          <input id="title" {...register("title")} />
        </div>
        <div className="form-group">
          <label htmlFor="description">Descripción</label>
          <textarea id="description" rows={3} {...register("description")} />
        </div>
        <div className="form-group">
          <label htmlFor="dueDate">Fecha de vencimiento</label>
          <input id="dueDate" type="date" {...register("dueDate")} />
        </div>
        <div className="form-group">
          <label htmlFor="dueTime">Hora de vencimiento</label>
          <input id="dueTime" type="time" {...register("dueTime")} />
        </div>
        <div className="form-group">
          <label htmlFor="priority">Prioridad</label>
          <select id="priority" {...register("priority")}>
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
