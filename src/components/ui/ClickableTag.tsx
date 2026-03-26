import { useNavigate } from "react-router-dom";

interface ClickableTagProps {
  tag: string;
  className?: string;
}

const ClickableTag = ({ tag, className = "text-[10px] text-primary font-medium" }: ClickableTagProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/tag/${encodeURIComponent(tag)}`);
      }}
      className={`${className} hover:underline transition-colors active:scale-95`}
    >
      #{tag}
    </button>
  );
};

export default ClickableTag;
