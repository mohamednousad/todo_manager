import type { MetaFunction } from "@remix-run/node";
import TodoApp from "../components/TodoApp";

export const meta: MetaFunction = () => {
  return [
    { title: "Todo Manager - Collaborative Task Management" },
    {
      name: "description",
      content: "Real-time collaborative todo list with drag and drop",
    },
  ];
};

export default function Index() {
  return <TodoApp />;
}
