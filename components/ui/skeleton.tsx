import { cn } from "cn"

/** Kotak tempat isi yang sedang dimuat; kilau yang lewat di atasnya diatur di globals.css. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton rounded-md bg-muted-foreground/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
