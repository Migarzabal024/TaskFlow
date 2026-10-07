import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import * as familyService from "../services/familyService";
import * as taskService from "../services/taskService";
import { createTaskSchema } from "../features/tasks/taskSchemas";
import ErrorAlert from "../components/ErrorAlert";

const emptySubtask = { title: "", description: "", dueTime: "", priority: "MEDIUM", assignedToId: "" };

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [serverError, setServerError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      mode: "simple",
      title: "",
      description: "",
      dueDate: "",
      dueTime: "",
      priority: "MEDIUM",
      assignedToId: "",
      subtasks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "subtasks" });
  const mode = watch("mode");

  useEffect(() => {
    familyService.getMembers().then(setMembers).catch(() => {});
  }, []);

  function switchMode(nextMode) {
    setValue("mode", nextMode);
    if (nextMode === "composite" && fields.length === 0) append(emptySubtask);
  }

  async function onSubmit(values) {
    setServerError("");
    try {
      const payload = {
        title: values.title,
        description: values.description || undefined,
        dueDate: values.dueDate,
        dueTime: values.dueTime || undefined,
        priority: values.priority,
      };
      if (values.mode === "simple") {
        payload.assignedToId = Number(values.assignedToId);
      } else {
        payload.subtasks = values.subtasks.map((s) => ({
          title: s.title,
          description: s.description || undefined,
          dueTime: s.dueTime || undefined,
          priority: s.priority,
          assignedToId: Number(s.assignedToId),
        }));
      }
      const task = await taskService.createTask(payload);
      navigate(`/app/tasks/${task.id}`);
    } catch (err) {
      setServerError(err.message);
    }
  }

  return (
    <div className="stack">
      <h1>Nueva tarea</h1>

      <div className="btn-group">
        <button
          type="button"
          className={`btn ${mode === "simple" ? "btn-primary" : "btn-outline"}`}
          onClick={() => switchMode("simple")}
        >
          Simple
        </button>
        <button
          type="button"
          className={`btn ${mode === "composite" ? "btn-primary" : "btn-outline"}`}
          onClick={() => switchMode("composite")}
        >
          Compuesta (con subtareas)
        </button>
      </div>

      <form className="form card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorAlert message={serverError} />

        <div className="form-group">
          <label htmlFor="title">Título</label>
          <input id="title" {...register("title")} />
          {errors.title && <span className="field-error">{errors.title.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Descripción (opcional)</label>
          <textarea id="description" rows={3} {...register("description")} />
        </div>

        <div className="form-group">
          <label htmlFor="dueDate">Fecha de vencimiento</label>
          <input id="dueDate" type="date" {...register("dueDate")} />
          {errors.dueDate && <span className="field-error">{errors.dueDate.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="dueTime">Hora de vencimiento (opcional)</label>
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

        {mode === "simple" ? (
          <div className="form-group">
            <label htmlFor="assignedToId">Asignar a</label>
            <select id="assignedToId" {...register("assignedToId")}>
              <option value="">Elegí un integrante</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
            {errors.assignedToId && <span className="field-error">{errors.assignedToId.message}</span>}
          </div>
        ) : (
          <div className="stack">
            <div className="page-header">
              <label style={{ margin: 0 }}>Subtareas</label>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => append(emptySubtask)}>
                + Agregar subtarea
              </button>
            </div>
            {errors.subtasks?.message && <span className="field-error">{errors.subtasks.message}</span>}
            {fields.map((field, index) => (
              <div className="card" key={field.id}>
                <div className="form-group">
                  <label>Título de la subtarea</label>
                  <input {...register(`subtasks.${index}.title`)} />
                  {errors.subtasks?.[index]?.title && (
                    <span className="field-error">{errors.subtasks[index].title.message}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Asignar a</label>
                  <select {...register(`subtasks.${index}.assignedToId`)}>
                    <option value="">Elegí un integrante</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {errors.subtasks?.[index]?.assignedToId && (
                    <span className="field-error">{errors.subtasks[index].assignedToId.message}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Prioridad</label>
                  <select {...register(`subtasks.${index}.priority`)}>
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => remove(index)}>
                  Quitar subtarea
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear tarea"}
        </button>
      </form>
    </div>
  );
}
