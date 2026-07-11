import {

useState,

useEffect

} from "react";

import API from "../services/api";

function EditVendorModal({

vendor = {},

onClose,

refresh

}) {

const [form,setForm] = useState({

business_name:

vendor?.business_name || "",

category:

vendor?.category || "",

city:

vendor?.city || "",

description:

vendor?.description || "",

price_range:

vendor?.price_range || "",

portfolio_image:

vendor?.portfolio_image || "",

gallery_images:

vendor?.gallery_images || []

});

useEffect(() => {

setForm({

business_name:

vendor?.business_name || "",

category:

vendor?.category || "",

city:

vendor?.city || "",

description:

vendor?.description || "",

price_range:

vendor?.price_range || "",

portfolio_image:

vendor?.portfolio_image || "",

gallery_images:

vendor?.gallery_images || []

});

}, [vendor]);

const handleChange = (e) => {

setForm({

...form,

[e.target.name]:

e.target.value

});

};

const saveVendor = async () => {

try {

const token = localStorage.getItem(

"token"

);

await API.put(

"/vendors/edit",

form,

{

headers:{

Authorization:

`Bearer ${token}`

}

}

);

alert(

"Vendor Updated"

);

refresh();

onClose();

}

catch(error){

console.log(error);

alert(

"Update Failed"

);

}

};

return (

<div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

<div className="bg-white w-[650px] rounded-3xl p-8 max-h-[90vh] overflow-y-auto">

<h2 className="text-3xl font-bold mb-6">

Edit Vendor Profile

</h2>

<div className="space-y-4">

<input

name="business_name"

value={form.business_name}

onChange={handleChange}

placeholder="Business Name"

className="w-full border rounded-xl p-4"

/>

<input

name="category"

value={form.category}

onChange={handleChange}

placeholder="Category"

className="w-full border rounded-xl p-4"

/>

<input

name="city"

value={form.city}

onChange={handleChange}

placeholder="City"

className="w-full border rounded-xl p-4"

/>

<input

name="price_range"

value={form.price_range}

onChange={handleChange}

placeholder="Price"

className="w-full border rounded-xl p-4"

/>

<textarea

name="description"

value={form.description}

onChange={handleChange}

placeholder="Description"

className="w-full border rounded-xl p-4"

/>

<input

name="portfolio_image"

value={form.portfolio_image}

onChange={handleChange}

placeholder="Portfolio Image URL"

className="w-full border rounded-xl p-4"

/>

<button

onClick={saveVendor}

className="w-full bg-purple-600 text-white p-4 rounded-xl"

>

Save Changes

</button>

<button

onClick={onClose}

className="w-full mt-3 border rounded-xl p-4"

>

Cancel

</button>

</div>

</div>

</div>

);

}

export default EditVendorModal;